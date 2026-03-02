# Phase 3 — Layers & Database

## AppLive (src/lib/layers/AppLive.ts)
```
AppLive = Layer.mergeAll(
  ApplicationService.Default,
  QAService.Default,
  JobImportService.Default,
  CVService.Default,  // self-contained: bundles DatabaseLayer + StorageServiceLive + TextExtractionServiceLive
)
```

## Migration: db/migrations/0004_create_cv_tables.ts
Creates:
- `cv_files` table (id UUID pk, name, file_key, file_type, file_size, extracted_text, is_base, parent_id FK self, version, metadata JSONB, timestamps)
- `application_cv` junction table (application_id FK, cv_file_id FK, composite PK)
- Indexes: parent_id, is_base, application_cv(cv_file_id)
- CASCADE delete on both parent_id and application_cv FKs
