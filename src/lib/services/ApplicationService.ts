import { SqlClient } from "@effect/sql";
import { SqlError } from "@effect/sql/SqlError";
import { Context, Effect, Layer, Schema } from "effect";
import { ApplicationNotFoundError, ApplicationValidationError } from "~/lib/errors";
import {
  Application,
  type ApplicationFilters,
  type ApplicationSort,
  type ApplicationStats,
  type CreateApplication,
  PaginatedResult,
  type UpdateApplication,
} from "~/lib/schemas/application";

const decodeApplication = Schema.decodeUnknown(Application);

export class ApplicationService extends Context.Tag("ApplicationService")<
  ApplicationService,
  {
    readonly getAll: (
      filters?: ApplicationFilters,
      sort?: ApplicationSort,
      page?: number,
      pageSize?: number,
    ) => Effect.Effect<PaginatedResult<typeof Application.Type>, SqlError>;
    readonly getById: (
      id: string,
    ) => Effect.Effect<typeof Application.Type, ApplicationNotFoundError | SqlError>;
    readonly create: (
      data: typeof CreateApplication.Type,
    ) => Effect.Effect<typeof Application.Type, ApplicationValidationError | SqlError>;
    readonly update: (
      id: string,
      data: typeof UpdateApplication.Type,
    ) => Effect.Effect<
      typeof Application.Type,
      ApplicationNotFoundError | ApplicationValidationError | SqlError
    >;
    readonly remove: (id: string) => Effect.Effect<void, ApplicationNotFoundError | SqlError>;
    readonly getStats: () => Effect.Effect<ApplicationStats, SqlError>;
  }
>() {}

export const ApplicationServiceLive = Layer.effect(
  ApplicationService,
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    return {
      getAll: (filters, sort, page = 1, pageSize = 20) =>
        Effect.gen(function* () {
          // Whitelist sort field/direction to prevent sql.unsafe injection
          const SORT_FIELDS: Record<string, string> = {
            company: "company",
            role: "role",
            status: "status",
            applied_at: "applied_at",
            created_at: "created_at",
            updated_at: "updated_at",
          };
          const safeField = SORT_FIELDS[sort?.field ?? "created_at"] ?? "created_at";
          const safeDir = sort?.direction === "asc" ? "ASC" : "DESC";

          const statusFilter: string | null = filters?.status ?? null;
          const searchFilter: string | null = filters?.search ? `%${filters.search}%` : null;

          const countResult = yield* sql`
            SELECT count(*)::int as total FROM applications
            WHERE (${statusFilter}::text IS NULL OR status = ${statusFilter})
              AND (${searchFilter}::text IS NULL
                   OR company ILIKE ${searchFilter}
                   OR role ILIKE ${searchFilter})
          `;
          const rows = yield* sql`
            SELECT * FROM applications
            WHERE (${statusFilter}::text IS NULL OR status = ${statusFilter})
              AND (${searchFilter}::text IS NULL
                   OR company ILIKE ${searchFilter}
                   OR role ILIKE ${searchFilter})
            ORDER BY ${sql.unsafe(safeField)} ${sql.unsafe(safeDir)}
            LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
          `;

          const total = (countResult[0]?.total as number) ?? 0;
          const items = yield* Effect.forEach(rows, (row) =>
            decodeApplication(row).pipe(
              Effect.mapError(
                () =>
                  new SqlError({
                    cause: new Error("Failed to decode application row"),
                    message: "Decode error",
                  }),
              ),
            ),
          );

          return new PaginatedResult(items, total, page, pageSize);
        }),

      getById: (id) =>
        Effect.gen(function* () {
          const rows = yield* sql`SELECT * FROM applications WHERE id = ${id}`;
          if (rows.length === 0) {
            return yield* new ApplicationNotFoundError({ id });
          }
          return yield* decodeApplication(rows[0]).pipe(
            Effect.mapError(
              () =>
                new SqlError({
                  cause: new Error("Failed to decode application row"),
                  message: "Decode error",
                }),
            ),
          );
        }),

      create: (data) =>
        Effect.gen(function* () {
          const appliedAt =
            data.status !== "draft" && !data.applied_at
              ? new Date().toISOString()
              : data.applied_at;

          const rows = yield* sql`
            INSERT INTO applications (company, role, url, status, job_description, salary_range, location, platform, contact_name, contact_email, notes, applied_at, next_action, next_action_date)
            VALUES (${data.company}, ${data.role}, ${data.url}, ${data.status}, ${data.job_description}, ${data.salary_range}, ${data.location}, ${data.platform}, ${data.contact_name}, ${data.contact_email}, ${data.notes}, ${appliedAt}, ${data.next_action}, ${data.next_action_date})
            RETURNING *
          `;
          return yield* decodeApplication(rows[0]).pipe(
            Effect.mapError(
              () =>
                new SqlError({
                  cause: new Error("Failed to decode application row"),
                  message: "Decode error",
                }),
            ),
          );
        }),

      update: (id, data) =>
        Effect.gen(function* () {
          // Check exists first
          const existing = yield* sql`SELECT id FROM applications WHERE id = ${id}`;
          if (existing.length === 0) {
            return yield* new ApplicationNotFoundError({ id });
          }

          // Build SET clauses for provided fields
          const updates: Record<string, unknown> = {};
          if (data.company !== undefined) updates.company = data.company;
          if (data.role !== undefined) updates.role = data.role;
          if (data.url !== undefined) updates.url = data.url;
          if (data.status !== undefined) updates.status = data.status;
          if (data.job_description !== undefined) updates.job_description = data.job_description;
          if (data.salary_range !== undefined) updates.salary_range = data.salary_range;
          if (data.location !== undefined) updates.location = data.location;
          if (data.platform !== undefined) updates.platform = data.platform;
          if (data.contact_name !== undefined) updates.contact_name = data.contact_name;
          if (data.contact_email !== undefined) updates.contact_email = data.contact_email;
          if (data.notes !== undefined) updates.notes = data.notes;
          if (data.applied_at !== undefined) updates.applied_at = data.applied_at;
          if (data.next_action !== undefined) updates.next_action = data.next_action;
          if (data.next_action_date !== undefined) updates.next_action_date = data.next_action_date;

          if (Object.keys(updates).length === 0) {
            return yield* new ApplicationValidationError({ message: "No fields to update" });
          }

          const rows = yield* sql`
            UPDATE applications
            SET ${sql.update(updates)}, updated_at = now()
            WHERE id = ${id}
            RETURNING *
          `;

          return yield* decodeApplication(rows[0]).pipe(
            Effect.mapError(
              () =>
                new SqlError({
                  cause: new Error("Failed to decode application row"),
                  message: "Decode error",
                }),
            ),
          );
        }),

      remove: (id) =>
        Effect.gen(function* () {
          const rows = yield* sql`DELETE FROM applications WHERE id = ${id} RETURNING id`;
          if (rows.length === 0) {
            return yield* new ApplicationNotFoundError({ id });
          }
        }),

      getStats: () =>
        Effect.gen(function* () {
          const totalResult = yield* sql`SELECT count(*)::int as total FROM applications`;
          const statusResult = yield* sql`
            SELECT status, count(*)::int as count
            FROM applications
            GROUP BY status
          `;

          const byStatus: Record<string, number> = {};
          for (const row of statusResult) {
            byStatus[row.status as string] = row.count as number;
          }

          return {
            total: (totalResult[0]?.total as number) ?? 0,
            byStatus,
          };
        }),
    };
  }),
);
