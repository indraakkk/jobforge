# Phase 3 — Services

## CVService (src/lib/services/CVService.ts)
Pattern: `Effect.Service` with `dependencies: [DatabaseLayer, StorageServiceLive, TextExtractionServiceLive]`

Methods:
- `uploadBase(fileData, fileName, fileType, metadata?)` → upload to MinIO, extract text (soft fail), insert DB
- `uploadVariant(fileData, fileName, fileType, parentId, metadata?)` → verify parent is base, auto-version
- `findById(id)` → single CV
- `findBase()` → all base CVs with variant count
- `findVariants(parentId)` → variants of a base CV
- `linkToApplication(cvId, applicationId)` → junction table insert (ON CONFLICT DO NOTHING)
- `unlinkFromApplication(cvId, applicationId)` → junction table delete
- `findByApplication(applicationId)` → CVs linked to an application
- `download(id)` → file bytes from MinIO
- `getDownloadUrl(id)` → presigned URL (1 hour)
- `remove(id)` → delete from MinIO + DB

## StorageServiceLive (src/lib/services/StorageService.ts)
Pattern: `Layer.effect(StorageService, Effect.gen(...))` with S3Client
Config: `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`
Bucket: `cv-files`, `forcePathStyle: true`
Presigned URLs expire in 3600s

## TextExtractionServiceLive (src/lib/services/TextExtractionService.ts)
Pattern: `Layer.succeed(TextExtractionService, { extract: ... })`
PDF: `pdf-parse` v2 (PDFParse class, `.getText()`)
DOCX: `mammoth` (`.extractRawText()`)

## Key Design Decisions
- Text extraction is synchronous during upload (CVs are small)
- Soft failure: if extraction fails, file still uploads with `extracted_text = null`
- CVService includes StorageServiceLive + TextExtractionServiceLive in its `dependencies` array so `CVService.Default` is self-contained
- TanStack Start's ServerFn type transforms `unknown` → `{}` in metadata — use `Record<string, {}>` cast in serializer
