# Phase 1: Foundation

**Goal:** App boots with Bun, database connected, MinIO ready, Effect services wired up, basic Application Tracker CRUD works.

## Prerequisites
- Phase 0 complete (Effect TS understood, assumptions verified)
- Docker installed (for PostgreSQL + MinIO)

## Tasks

### 1. Initialize TanStack Start project
```bash
bun create tanstack-app jobforge
```
- Configure for Bun runtime
- Set up TypeScript with strict mode
- Add Tailwind CSS

### 2. Set up Nix dev environment
Create `flake.nix` with:
- Bun
- Docker CLI
- PostgreSQL client (psql)

### 3. Create Docker Compose
`docker-compose.yml` with:
- PostgreSQL 16 (port 5432)
- MinIO (API port 9000, console port 9001)
- MinIO init container (create default bucket)

### 4. Install Effect dependencies
```bash
bun add effect @effect/sql @effect/sql-pg @effect/platform-bun @aws-sdk/client-s3
```

### 5. Define error types
`src/lib/errors/application.ts`:
- `ApplicationNotFoundError`
- `ApplicationValidationError`
- `DatabaseError`

All extending `Schema.TaggedError`.

### 6. Create Effect services
- `DatabaseService` — PgClient Layer from @effect/sql-pg
- `StorageService` — MinIO/S3 operations (placeholder for Phase 3)
- Config via `Config.redacted("DATABASE_URL")` etc.

### 7. Database setup
- `db/client.ts` — PgClient.layerConfig
- `db/migrations/0001_create_applications.sql` — Applications table
- `db/migrate.ts` — PgMigrator runner
- `db/seed.ts` — Sample application data

### 8. Application Tracker CRUD
Server functions in `src/server/functions/`:
- `getApplications` — list with optional status filter
- `getApplication` — by ID
- `createApplication` — with Schema validation
- `updateApplication` — partial update
- `deleteApplication` — soft or hard delete

Routes in `src/routes/`:
- `/applications` — list page with status filter tabs
- `/applications/$id` — detail page
- `/applications/new` — create form

### 9. Package.json scripts
```json
{
  "scripts": {
    "dev": "bun --bun tanstack-start dev",
    "build": "bun --bun tanstack-start build",
    "start": "bun --bun tanstack-start start",
    "db:migrate": "bun db/migrate.ts",
    "db:seed": "bun db/seed.ts",
    "test": "bun test"
  }
}
```

## Deliverables
- [ ] `bun dev` starts the app
- [ ] `docker compose up -d` starts PostgreSQL + MinIO
- [ ] `bun db:migrate` creates tables
- [ ] `bun db:seed` inserts sample data
- [ ] Can add, view, edit, and filter job applications
- [ ] All server functions use Effect with typed errors
- [ ] No try/catch, no process.env, no ORM
