# Phase 3: CV Version Manager

**Goal:** Upload, store, version, and link CV files using MinIO. Extract text for AI processing.

## Prerequisites
- Phase 2 complete (Q&A vault working)
- MinIO running via Docker Compose

## Tasks

### 1. Database migration
`db/migrations/0004_create_cv_tables.sql`:
```sql
CREATE TABLE cv_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  file_key TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER NOT NULL,
  extracted_text TEXT,
  is_base BOOLEAN NOT NULL DEFAULT false,
  parent_id UUID REFERENCES cv_files(id) ON DELETE SET NULL,
  version INTEGER NOT NULL DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE application_cv (
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  cv_file_id UUID REFERENCES cv_files(id) ON DELETE CASCADE,
  PRIMARY KEY (application_id, cv_file_id)
);

CREATE INDEX idx_cv_parent ON cv_files(parent_id);
CREATE INDEX idx_cv_base ON cv_files(is_base) WHERE is_base = true;
```

### 2. StorageService implementation
Complete the MinIO/S3 service:
```
upload(file, key) → Effect<UploadResult, StorageError>
download(key) → Effect<Buffer, StorageError>
delete(key) → Effect<void, StorageError>
getPresignedUrl(key) → Effect<string, StorageError>
```

All wrapped with `Effect.tryPromise` and tagged `StorageError`.

### 3. Text extraction
Install dependencies:
```bash
bun add mammoth pdf-parse
```

Create `TextExtractionService`:
- `extractFromDocx(buffer)` → plain text via mammoth
- `extractFromPdf(buffer)` → plain text via pdf-parse
- Route by file type
- Wrap with `Effect.tryPromise` → `ExtractionError`

### 4. Error types
`src/lib/errors/cv.ts`:
- `CVNotFoundError`
- `StorageError`
- `ExtractionError`
- `CVValidationError`

### 5. CV service
- `uploadBase(file, name)` — upload base CV, extract text, store metadata
- `uploadVariant(file, name, parentId, metadata)` — upload variant linked to base
- `findById(id)` — get CV with metadata
- `findBase()` — get all base CVs
- `findVariants(parentId)` — get variants of a base CV
- `linkToApplication(cvId, applicationId)` — junction table insert
- `download(id)` — get file from MinIO
- `delete(id)` — remove from DB + MinIO

### 6. Server functions
`src/server/functions/cv.ts`:
- `uploadCV` — multipart upload handling
- `getCVFiles` — list with filter (base/variants)
- `getCVFile` — by ID with metadata
- `downloadCV` — stream file
- `deleteCV`
- `linkCVToApplication`

### 7. Routes
- `/cv` — CV list page (base CVs with variant counts)
- `/cv/$id` — CV detail (metadata, extracted text preview, variants list)
- `/cv/upload` — upload form (base or variant)
- Embed CV section in `/applications/$id` detail page

## Deliverables
- [ ] File upload to MinIO working (DOCX + PDF)
- [ ] Text extraction produces usable plain text
- [ ] Base CV → variant hierarchy works
- [ ] CVs linkable to applications
- [ ] File download works
- [ ] Extracted text stored for AI processing (Phase 4)
- [ ] All operations use Effect with tagged errors
