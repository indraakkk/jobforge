import { SqlClient } from "@effect/sql";
import { SqlError } from "@effect/sql/SqlError";
import { DatabaseLayer } from "db/client";
import { Effect, Schema } from "effect";
import { CVNotFoundError, CVValidationError } from "~/lib/errors/cv";
import { CVFile, type CVFileWithVariantCount } from "~/lib/schemas/cv";
import { StorageService, StorageServiceLive } from "~/lib/services/StorageService";
import {
  TextExtractionService,
  TextExtractionServiceLive,
} from "~/lib/services/TextExtractionService";

const _decode = Schema.decodeUnknown(CVFile);
const decodeRow = (row: unknown) =>
  _decode(row).pipe(
    Effect.mapError(
      () =>
        new SqlError({
          cause: new Error("Failed to decode CV file row"),
          message: "Decode error",
        }),
    ),
  );

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export interface UploadVariantOptions {
  tailoringNotes?: string;
  targetJobDescription?: string;
  targetCompany?: string;
  targetRole?: string;
  metadata?: Record<string, unknown>;
  /** Override extracted_text (used for AI-generated variants where text is the primary content) */
  extractedTextOverride?: string;
}

export class CVService extends Effect.Service<CVService>()("CVService", {
  dependencies: [DatabaseLayer, StorageServiceLive, TextExtractionServiceLive],
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const storage = yield* StorageService;
    const extractor = yield* TextExtractionService;

    return {
      uploadBase: (
        fileData: Uint8Array,
        fileName: string,
        fileType: string,
        metadata: Record<string, unknown> = {},
      ) =>
        Effect.gen(function* () {
          if (!ALLOWED_TYPES.includes(fileType)) {
            return yield* new CVValidationError({
              message: `Unsupported file type: ${fileType}. Only PDF and DOCX are allowed.`,
            });
          }

          const fileKey = `base/${crypto.randomUUID()}/${fileName}`;
          yield* storage.upload(fileKey, fileData, fileType);

          // Soft-fail text extraction
          const extracted: string | null = yield* extractor
            .extract(fileData, fileType)
            .pipe(Effect.catchTag("ExtractionError", () => Effect.succeed(null as string | null)));

          const rows = yield* sql`
            INSERT INTO cv_files (name, file_key, file_type, file_size, extracted_text, is_base, metadata)
            VALUES (${fileName}, ${fileKey}, ${fileType}, ${fileData.length}, ${extracted}, true, ${JSON.stringify(metadata)}::jsonb)
            RETURNING *
          `;
          return yield* decodeRow(rows[0]);
        }),

      uploadVariant: (
        fileData: Uint8Array,
        fileName: string,
        fileType: string,
        parentId: string,
        options: UploadVariantOptions = {},
      ) =>
        Effect.gen(function* () {
          if (!ALLOWED_TYPES.includes(fileType)) {
            return yield* new CVValidationError({
              message: `Unsupported file type: ${fileType}. Only PDF and DOCX are allowed.`,
            });
          }

          // Verify parent is a base CV
          const parentRows = yield* sql`
            SELECT id, is_base FROM cv_files WHERE id = ${parentId}
          `;
          if (parentRows.length === 0) {
            return yield* new CVNotFoundError({ id: parentId });
          }
          if (!parentRows[0].is_base) {
            return yield* new CVValidationError({
              message: "Variants can only be created from base CVs",
            });
          }

          const fileKey = `variants/${parentId}/${crypto.randomUUID()}/${fileName}`;
          yield* storage.upload(fileKey, fileData, fileType);

          // Use extractedTextOverride if provided (e.g. AI-generated variants), else extract
          const extracted: string | null =
            options.extractedTextOverride !== undefined
              ? options.extractedTextOverride
              : yield* extractor
                  .extract(fileData, fileType)
                  .pipe(
                    Effect.catchTag("ExtractionError", () => Effect.succeed(null as string | null)),
                  );

          const metadata = options.metadata ?? {};
          const tailoringNotes = options.tailoringNotes ?? null;
          const targetJobDescription = options.targetJobDescription ?? null;
          const targetCompany = options.targetCompany ?? null;
          const targetRole = options.targetRole ?? null;

          // Compute version atomically in INSERT to avoid race conditions
          const rows = yield* sql`
            INSERT INTO cv_files (
              name, file_key, file_type, file_size, extracted_text, is_base, parent_id, version,
              metadata, tailoring_notes, target_job_description, target_company, target_role
            )
            VALUES (
              ${fileName}, ${fileKey}, ${fileType}, ${fileData.length}, ${extracted}, false, ${parentId},
              (SELECT COALESCE(MAX(version), 0) + 1 FROM cv_files WHERE parent_id = ${parentId}),
              ${JSON.stringify(metadata)}::jsonb,
              ${tailoringNotes}, ${targetJobDescription}, ${targetCompany}, ${targetRole}
            )
            RETURNING *
          `;
          return yield* decodeRow(rows[0]);
        }),

      findById: (id: string) =>
        Effect.gen(function* () {
          const rows = yield* sql`SELECT * FROM cv_files WHERE id = ${id}`;
          if (rows.length === 0) {
            return yield* new CVNotFoundError({ id });
          }
          return yield* decodeRow(rows[0]);
        }),

      findBase: () =>
        Effect.gen(function* () {
          const rows = yield* sql`
            SELECT c.*, COALESCE(v.cnt, 0)::int as variant_count
            FROM cv_files c
            LEFT JOIN (
              SELECT parent_id, count(*) as cnt FROM cv_files WHERE parent_id IS NOT NULL GROUP BY parent_id
            ) v ON v.parent_id = c.id
            WHERE c.is_base = true
            ORDER BY c.created_at DESC
          `;
          const results: CVFileWithVariantCount[] = [];
          for (const row of rows) {
            const variantCount = row.variant_count as number;
            const decoded = yield* decodeRow(row);
            results.push({ ...decoded, variant_count: variantCount });
          }
          return results;
        }),

      findVariants: (parentId: string) =>
        Effect.gen(function* () {
          const rows = yield* sql`
            SELECT * FROM cv_files WHERE parent_id = ${parentId} ORDER BY version DESC
          `;
          return yield* Effect.forEach(rows, decodeRow);
        }),

      findVariantsWithApplications: (parentId: string) =>
        Effect.gen(function* () {
          const rows = yield* sql`
            SELECT * FROM cv_files WHERE parent_id = ${parentId} ORDER BY version DESC
          `;
          const variants = yield* Effect.forEach(rows, decodeRow);
          // For each variant, fetch linked applications
          const result = yield* Effect.forEach(variants, (variant) =>
            Effect.gen(function* () {
              const appRows = yield* sql`
                SELECT a.id, a.company, a.role FROM applications a
                INNER JOIN application_cv ac ON ac.application_id = a.id
                WHERE ac.cv_file_id = ${variant.id}
                ORDER BY a.company
              `;
              return {
                ...variant,
                linked_applications: appRows as unknown as Array<{ id: string; company: string; role: string }>,
              };
            }),
          );
          return result;
        }),

      setActive: (id: string) =>
        Effect.gen(function* () {
          // Verify the CV exists and is a base CV
          const rows = yield* sql`SELECT id, is_base FROM cv_files WHERE id = ${id}`;
          if (rows.length === 0) {
            return yield* new CVNotFoundError({ id });
          }
          if (!rows[0].is_base) {
            return yield* new CVValidationError({
              message: "Only base CVs can be set as active",
            });
          }
          // Deactivate all base CVs, then activate this one
          yield* sql`UPDATE cv_files SET is_active = false WHERE is_base = true`;
          yield* sql`UPDATE cv_files SET is_active = true WHERE id = ${id}`;
        }),

      linkToApplication: (cvId: string, applicationId: string) =>
        Effect.gen(function* () {
          yield* sql`
            INSERT INTO application_cv (application_id, cv_file_id)
            VALUES (${applicationId}, ${cvId})
            ON CONFLICT DO NOTHING
          `;
        }),

      unlinkFromApplication: (cvId: string, applicationId: string) =>
        Effect.gen(function* () {
          yield* sql`
            DELETE FROM application_cv
            WHERE application_id = ${applicationId} AND cv_file_id = ${cvId}
          `;
        }),

      findByApplication: (applicationId: string) =>
        Effect.gen(function* () {
          const rows = yield* sql`
            SELECT c.* FROM cv_files c
            INNER JOIN application_cv ac ON ac.cv_file_id = c.id
            WHERE ac.application_id = ${applicationId}
            ORDER BY c.created_at DESC
          `;
          return yield* Effect.forEach(rows, decodeRow);
        }),

      findApplicationsByCV: (cvId: string) =>
        Effect.gen(function* () {
          const rows = yield* sql`
            SELECT a.id, a.company, a.role FROM applications a
            INNER JOIN application_cv ac ON ac.application_id = a.id
            WHERE ac.cv_file_id = ${cvId}
            ORDER BY a.company
          `;
          return rows as unknown as Array<{ id: string; company: string; role: string }>;
        }),

      download: (id: string) =>
        Effect.gen(function* () {
          const rows = yield* sql`SELECT file_key FROM cv_files WHERE id = ${id}`;
          if (rows.length === 0) {
            return yield* new CVNotFoundError({ id });
          }
          return yield* storage.download(rows[0].file_key as string);
        }),

      getDownloadUrl: (id: string) =>
        Effect.gen(function* () {
          const rows = yield* sql`SELECT file_key FROM cv_files WHERE id = ${id}`;
          if (rows.length === 0) {
            return yield* new CVNotFoundError({ id });
          }
          return yield* storage.getUrl(rows[0].file_key as string);
        }),

      remove: (id: string) =>
        Effect.gen(function* () {
          const rows = yield* sql`SELECT file_key FROM cv_files WHERE id = ${id}`;
          if (rows.length === 0) {
            return yield* new CVNotFoundError({ id });
          }
          const fileKey = rows[0].file_key as string;
          // Get variant file keys before cascade deletes the rows
          const variantRows = yield* sql`SELECT file_key FROM cv_files WHERE parent_id = ${id}`;
          // Delete DB row (cascade removes variant rows)
          yield* sql`DELETE FROM cv_files WHERE id = ${id}`;
          // Clean up all storage objects
          yield* storage.remove(fileKey);
          yield* Effect.forEach(variantRows, (r) => storage.remove(r.file_key as string), {
            concurrency: 5,
          });
        }),
    } as const;
  }),
}) {}
