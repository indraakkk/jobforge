import { SqlClient } from "@effect/sql";
import { Effect } from "effect";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  // Add is_active boolean to base CVs
  yield* sql`
    ALTER TABLE cv_files
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false
  `;

  // Add tailoring_notes text column
  yield* sql`
    ALTER TABLE cv_files
    ADD COLUMN IF NOT EXISTS tailoring_notes TEXT
  `;

  // Add target_job_description text column
  yield* sql`
    ALTER TABLE cv_files
    ADD COLUMN IF NOT EXISTS target_job_description TEXT
  `;

  // Add target_company and target_role columns for structured metadata
  yield* sql`
    ALTER TABLE cv_files
    ADD COLUMN IF NOT EXISTS target_company TEXT
  `;

  yield* sql`
    ALTER TABLE cv_files
    ADD COLUMN IF NOT EXISTS target_role TEXT
  `;

  // Set first base CV as active if none are active yet
  yield* sql`
    UPDATE cv_files
    SET is_active = true
    WHERE id = (
      SELECT id FROM cv_files WHERE is_base = true ORDER BY created_at ASC LIMIT 1
    )
    AND NOT EXISTS (
      SELECT 1 FROM cv_files WHERE is_base = true AND is_active = true
    )
  `;
});
