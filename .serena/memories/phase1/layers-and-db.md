# Phase 1 — Layers & Database

## AppLive (src/lib/layers/AppLive.ts)
Composition:
```
AppLive = ApplicationServiceLive.pipe(
  Layer.provideMerge(StorageServiceStub),
  Layer.provideMerge(DatabaseLive),
  Layer.provideMerge(BunContext.layer),
)
```

## DatabaseLive (db/client.ts)
```
DatabaseLive = PgClient.layerConfig({ url: Config.redacted("DATABASE_URL") })
```

## Migration: db/migrations/0001_create_applications.ts
Creates `applications` table with:
- id (UUID, pk, gen_random_uuid)
- company, role (NOT NULL)
- url, status, job_description, salary_range, location, platform, contact_name, contact_email, notes (nullable)
- applied_at, next_action, next_action_date (nullable)
- created_at, updated_at (timestamps with defaults)
- Status CHECK constraint: draft, applied, screening, interviewing, offer, accepted, rejected, withdrawn

## db/migrate.ts
Uses PgMigrator runner with Effect

## db/seed.ts
Seeds 7 sample applications covering all statuses (interviewing, applied, screening, offer, draft, rejected, withdrawn)
