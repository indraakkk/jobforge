import { SqlClient } from "@effect/sql";
import { createServerFn } from "@tanstack/react-start";
import { DatabaseLayer } from "db/client";
import { Effect } from "effect";
import { AppLive } from "~/lib/layers/AppLive";
import type { JobImportResult } from "~/lib/services/JobImportService";
import { JobImportService } from "~/lib/services/JobImportService";

export type ImportJobResponse =
  | { type: "ok"; data: JobImportResult }
  | { type: "duplicate"; existingId: string; existingCompany: string; existingRole: string };

export const importJobFromUrl = createServerFn({ method: "POST" })
  .inputValidator((input: { url: string; force?: boolean }) => input)
  .handler(async ({ data }): Promise<ImportJobResponse> => {
    const parsed = new URL(data.url.trim());
    const normalizedUrl = (parsed.origin + parsed.pathname).replace(/\/+$/, "");

    if (!data.force) {
      const existing = await Effect.runPromise(
        Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient;
          const rows = yield* sql<{ id: string; company: string; role: string }>`
            SELECT id, company, role FROM applications
            WHERE url IS NOT NULL
              AND RTRIM(SPLIT_PART(SPLIT_PART(url, '#', 1), '?', 1), '/') = ${normalizedUrl}
            ORDER BY created_at DESC LIMIT 1
          `;
          return rows.length > 0 ? rows[0] : null;
        }).pipe(Effect.provide(DatabaseLayer)),
      );

      if (existing) {
        return {
          type: "duplicate",
          existingId: existing.id,
          existingCompany: existing.company,
          existingRole: existing.role,
        };
      }
    }

    const result = await Effect.runPromise(
      JobImportService.pipe(
        Effect.flatMap((svc) => svc.importFromUrl(data.url)),
        Effect.provide(AppLive),
      ),
    );

    return { type: "ok", data: result };
  });
