import path from "node:path";
import { BunContext } from "@effect/platform-bun";
import { PgMigrator } from "@effect/sql-pg";
import { Console, Effect, Layer } from "effect";
import { DatabaseLive } from "./client";

const migrationsDir = path.resolve(import.meta.dir, "migrations");

const program = PgMigrator.run({
  loader: PgMigrator.fromFileSystem(migrationsDir),
  schemaDirectory: path.resolve(import.meta.dir, "schema"),
}).pipe(
  Effect.tap((migrations) =>
    migrations.length > 0
      ? Console.log(
          `Ran ${migrations.length} migration(s): ${migrations.map(([id, name]) => `${id}_${name}`).join(", ")}`,
        )
      : Console.log("No new migrations to run."),
  ),
  Effect.catchAll((error) =>
    Console.error(`Migration failed: ${error}`).pipe(Effect.andThen(Effect.die(error))),
  ),
);

const MainLive = Layer.mergeAll(DatabaseLive, BunContext.layer);

Effect.runPromise(program.pipe(Effect.provide(MainLive)));
