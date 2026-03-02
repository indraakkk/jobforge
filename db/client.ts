import { BunContext } from "@effect/platform-bun";
import { PgClient } from "@effect/sql-pg";
import { Config, Layer } from "effect";

export const DatabaseLive = PgClient.layerConfig({
  url: Config.redacted("DATABASE_URL"),
});

export const DatabaseLayer = DatabaseLive.pipe(Layer.provide(BunContext.layer));
