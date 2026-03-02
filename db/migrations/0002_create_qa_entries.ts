import { SqlClient } from "@effect/sql";
import { Effect } from "effect";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`
    CREATE TABLE IF NOT EXISTS qa_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      answer TEXT NOT NULL DEFAULT '',
      tags TEXT[] NOT NULL DEFAULT '{}',
      search_vector TSVECTOR,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  yield* sql`CREATE INDEX IF NOT EXISTS idx_qa_entries_application_id ON qa_entries(application_id)`;
  yield* sql`CREATE INDEX IF NOT EXISTS idx_qa_entries_search_vector ON qa_entries USING GIN(search_vector)`;
  yield* sql`CREATE INDEX IF NOT EXISTS idx_qa_entries_tags ON qa_entries USING GIN(tags)`;
});
