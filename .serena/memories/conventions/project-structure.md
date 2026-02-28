# Project Structure

```
src/
  routes/          # TanStack file-based routes (React components)
  components/      # App components (~/components/*) + ui/ (shadcn, @/components/ui/*)
  lib/
    errors/        # Tagged error types by module
    schemas/       # Effect Schema definitions
    services/      # Effect service definitions + Layer implementations
    layers/        # Composed Layer exports (AppLive, TestLive)
  server/
    functions/     # Server functions (Effect → plain data bridge)
db/
  client.ts        # DatabaseLive layer (PgClient.layerConfig)
  migrate.ts       # PgMigrator runner
  seed.ts          # Sample data seeder
  migrations/      # Numbered migration files
docs/              # Phase plans and architecture docs
```

## Tech Stack
- Runtime: Bun
- Framework: TanStack Start (React, file-based routing)
- Functional core: Effect TS
- Database: PostgreSQL via @effect/sql-pg
- File storage: MinIO (S3-compatible)
- Styling: Tailwind CSS 4
- Testing: bun:test
