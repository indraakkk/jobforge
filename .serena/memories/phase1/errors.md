# Phase 1 — Error Types

All errors use `Schema.TaggedError` pattern from `effect`.

## src/lib/errors/application.ts
- `ApplicationNotFoundError` — `_tag: "ApplicationNotFoundError"`, fields: `{ id: Schema.String }`
- `ApplicationValidationError` — `_tag: "ApplicationValidationError"`, fields: `{ message: Schema.String }`

## src/lib/errors/database.ts
- `DatabaseError` — `_tag: "DatabaseError"`, fields: `{ message: Schema.String, cause: Schema.optional(Schema.Unknown) }`

## src/lib/errors/storage.ts
- `StorageError` — `_tag: "StorageError"`, fields: `{ message: Schema.String, cause: Schema.optional(Schema.Unknown) }`

## src/lib/errors/index.ts
Re-exports all errors from the above files.
