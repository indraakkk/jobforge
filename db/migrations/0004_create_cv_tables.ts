import { SqlClient } from "@effect/sql";
import { Effect } from "effect";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`
    CREATE TABLE IF NOT EXISTS cv_files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      file_key TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      extracted_text TEXT,
      is_base BOOLEAN NOT NULL DEFAULT true,
      parent_id UUID REFERENCES cv_files(id) ON DELETE CASCADE,
      version INTEGER NOT NULL DEFAULT 1,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  yield* sql`
    CREATE TABLE IF NOT EXISTS application_cv (
      application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      cv_file_id UUID NOT NULL REFERENCES cv_files(id) ON DELETE CASCADE,
      PRIMARY KEY (application_id, cv_file_id)
    )
  `;

  yield* sql`CREATE INDEX IF NOT EXISTS idx_cv_files_parent_id ON cv_files(parent_id)`;
  yield* sql`CREATE INDEX IF NOT EXISTS idx_cv_files_is_base ON cv_files(is_base)`;
  yield* sql`CREATE INDEX IF NOT EXISTS idx_application_cv_cv_file_id ON application_cv(cv_file_id)`;
});
