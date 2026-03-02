import { SqlClient } from "@effect/sql";
import { SqlError } from "@effect/sql/SqlError";
import { DatabaseLayer } from "db/client";
import { Effect, Schema } from "effect";
import { QANotFoundError, QAValidationError } from "~/lib/errors/qa";
import { PaginatedResult } from "~/lib/schemas/common";
import {
  type CreateQAEntry,
  QAEntry,
  type QASearchFilters,
  type UpdateQAEntry,
} from "~/lib/schemas/qa";

const _decode = Schema.decodeUnknown(QAEntry);
const decodeRow = (row: unknown) =>
  _decode(row).pipe(
    Effect.mapError(
      () =>
        new SqlError({
          cause: new Error("Failed to decode QA entry row"),
          message: "Decode error",
        }),
    ),
  );

export class QAService extends Effect.Service<QAService>()("QAService", {
  dependencies: [DatabaseLayer],
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    return {
      create: (data: typeof CreateQAEntry.Type) =>
        Effect.gen(function* () {
          const rows = yield* sql`
              INSERT INTO qa_entries (application_id, question, answer, tags)
              VALUES (${data.application_id}, ${data.question}, ${data.answer}, ${data.tags}::text[])
              RETURNING id, application_id, question, answer, tags, created_at, updated_at
            `;
          return yield* decodeRow(rows[0]);
        }),

      findById: (id: string) =>
        Effect.gen(function* () {
          const rows = yield* sql`
              SELECT id, application_id, question, answer, tags, created_at, updated_at
              FROM qa_entries WHERE id = ${id}
            `;
          if (rows.length === 0) {
            return yield* new QANotFoundError({ id });
          }
          return yield* decodeRow(rows[0]);
        }),

      findByApplication: (applicationId: string) =>
        Effect.gen(function* () {
          const rows = yield* sql`
              SELECT id, application_id, question, answer, tags, created_at, updated_at
              FROM qa_entries WHERE application_id = ${applicationId}
              ORDER BY created_at ASC
            `;
          return yield* Effect.forEach(rows, decodeRow);
        }),

      search: (filters?: QASearchFilters, page = 1, pageSize = 20) =>
        Effect.gen(function* () {
          const queryFilter: string | null = filters?.query ?? null;
          const appFilter: string | null = filters?.applicationId ?? null;
          const tagFilter: string[] | null =
            filters?.tags && filters.tags.length > 0 ? filters.tags : null;

          const countResult = yield* sql`
              SELECT count(*)::int as total FROM qa_entries
              WHERE (${appFilter}::text IS NULL OR application_id = ${appFilter}::uuid)
                AND (${tagFilter}::text[] IS NULL OR tags && ${tagFilter}::text[])
                AND (${queryFilter}::text IS NULL OR search_vector @@ websearch_to_tsquery('english', ${queryFilter}))
            `;

          const rows = yield* sql`
              SELECT id, application_id, question, answer, tags, created_at, updated_at
              FROM qa_entries
              WHERE (${appFilter}::text IS NULL OR application_id = ${appFilter}::uuid)
                AND (${tagFilter}::text[] IS NULL OR tags && ${tagFilter}::text[])
                AND (${queryFilter}::text IS NULL OR search_vector @@ websearch_to_tsquery('english', ${queryFilter}))
              ORDER BY ${queryFilter ? sql`ts_rank(search_vector, websearch_to_tsquery('english', ${queryFilter})) DESC` : sql`created_at DESC`}
              LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
            `;

          const total = (countResult[0]?.total as number) ?? 0;
          const items = yield* Effect.forEach(rows, decodeRow);

          return new PaginatedResult(items, total, page, pageSize);
        }),

      update: (id: string, data: typeof UpdateQAEntry.Type) =>
        Effect.gen(function* () {
          const updates: Record<string, unknown> = {};
          if (data.question !== undefined) updates.question = data.question;
          if (data.answer !== undefined) updates.answer = data.answer;
          if (data.tags !== undefined) updates.tags = data.tags;

          if (Object.keys(updates).length === 0) {
            return yield* new QAValidationError({ message: "No fields to update" });
          }

          const rows = yield* sql`
              UPDATE qa_entries
              SET ${sql.update(updates)}, updated_at = now()
              WHERE id = ${id}
              RETURNING id, application_id, question, answer, tags, created_at, updated_at
            `;
          if (rows.length === 0) {
            return yield* new QANotFoundError({ id });
          }
          return yield* decodeRow(rows[0]);
        }),

      remove: (id: string) =>
        Effect.gen(function* () {
          const rows = yield* sql`DELETE FROM qa_entries WHERE id = ${id} RETURNING id`;
          if (rows.length === 0) {
            return yield* new QANotFoundError({ id });
          }
        }),

      listTags: () =>
        Effect.gen(function* () {
          const rows = yield* sql`
              SELECT DISTINCT unnest(tags) as tag FROM qa_entries ORDER BY tag
            `;
          return rows.map((row) => row.tag as string);
        }),
    } as const;
  }),
}) {}
