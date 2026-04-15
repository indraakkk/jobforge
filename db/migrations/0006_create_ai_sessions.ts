import { SqlClient } from "@effect/sql";
import { Effect } from "effect";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  // Create the status enum type
  yield* sql`
    DO $$ BEGIN
      CREATE TYPE ai_session_status AS ENUM ('pending', 'completed', 'accepted', 'rejected');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$
  `;

  yield* sql`
    CREATE TABLE IF NOT EXISTS ai_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
      base_cv_id UUID NOT NULL REFERENCES cv_files(id) ON DELETE CASCADE,
      cv_variant_id UUID REFERENCES cv_files(id) ON DELETE SET NULL,
      job_description_input TEXT,
      prompt_used TEXT,
      ai_response TEXT,
      model_used VARCHAR(100),
      input_tokens INTEGER,
      output_tokens INTEGER,
      status ai_session_status NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  yield* sql`CREATE INDEX IF NOT EXISTS idx_ai_sessions_base_cv_id ON ai_sessions(base_cv_id)`;
  yield* sql`CREATE INDEX IF NOT EXISTS idx_ai_sessions_application_id ON ai_sessions(application_id)`;
  yield* sql`CREATE INDEX IF NOT EXISTS idx_ai_sessions_status ON ai_sessions(status)`;
});
