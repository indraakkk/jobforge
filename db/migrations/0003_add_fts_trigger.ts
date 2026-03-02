import { SqlClient } from "@effect/sql";
import { Effect } from "effect";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`
    CREATE OR REPLACE FUNCTION qa_search_vector_update() RETURNS trigger AS $$
    BEGIN
      NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.question, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.answer, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `;

  yield* sql`
    DROP TRIGGER IF EXISTS qa_search_vector_trigger ON qa_entries
  `;

  yield* sql`
    CREATE TRIGGER qa_search_vector_trigger
    BEFORE INSERT OR UPDATE ON qa_entries
    FOR EACH ROW EXECUTE FUNCTION qa_search_vector_update()
  `;
});
