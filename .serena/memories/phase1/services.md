# Phase 1 — Services

## ApplicationService (src/lib/services/ApplicationService.ts)
Tag: `"ApplicationService"` via `Context.Tag`

Methods:
- `getAll(filters?, sort?, page?, pageSize?)` → `Effect<PaginatedResult<Application>, SqlError>`
- `getById(id)` → `Effect<Application, ApplicationNotFoundError | SqlError>`
- `create(data: CreateApplication)` → `Effect<Application, ApplicationValidationError | SqlError>`
- `update(id, data: UpdateApplication)` → `Effect<Application, ApplicationNotFoundError | ApplicationValidationError | SqlError>`
- `remove(id)` → `Effect<void, ApplicationNotFoundError | SqlError>`
- `getStats()` → `Effect<ApplicationStats, SqlError>`

Implementation: `ApplicationServiceLive` — `Layer.effect` using `SqlClient.SqlClient`
- Decodes DB rows via `Schema.decodeUnknown(Application)`

## StorageService (src/lib/services/StorageService.ts)
Tag: `"StorageService"` via `Context.Tag`

Methods:
- `upload(key, data: Uint8Array, contentType)` → `Effect<string, StorageError>`
- `download(key)` → `Effect<Uint8Array, StorageError>`
- `remove(key)` → `Effect<void, StorageError>`
- `getUrl(key)` → `Effect<string, StorageError>`

Implementation: `StorageServiceStub` — placeholder for Phase 1, all methods fail with StorageError
- TODO: Replace with `StorageServiceLive` in Phase 3
