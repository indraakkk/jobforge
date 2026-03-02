# Phase 3: CV Version Manager — Status: COMPLETE

All deliverables implemented:
- `phase3/services` — CVService (12 methods), StorageServiceLive, TextExtractionServiceLive
- `phase3/layers-and-db` — AppLive updated, migration 0004

## Files Created
- `db/migrations/0004_create_cv_tables.ts` — cv_files + application_cv tables
- `src/lib/errors/cv.ts` — CVNotFoundError, CVValidationError, ExtractionError
- `src/lib/schemas/cv.ts` — CVFile, CreateCVFile, CVFileWithVariantCount
- `src/lib/services/TextExtractionService.ts` — PDF + DOCX extraction
- `src/lib/services/CVService.ts` — full CRUD + variants + app linking
- `src/server/functions/cv.ts` — 8 server functions
- `src/routes/cv/index.tsx` — CV list page
- `src/routes/cv/upload.tsx` — Upload form with parent selector
- `src/routes/cv/$id/index.tsx` — Detail page with variants + text preview

## Files Modified
- `src/lib/errors/index.ts` — added CV error exports
- `src/lib/schemas/forms.ts` — added cvUploadFormSchema (Zod)
- `src/lib/services/StorageService.ts` — added StorageServiceLive (S3Client + MinIO)
- `src/lib/layers/AppLive.ts` — replaced StorageServiceStub, added CVService.Default
- `src/components/CVPreviewPanel.tsx` — real CV panel with download/unlink
- `src/components/app-sidebar.tsx` — enabled CV Manager nav
- `src/routes/applications/$id/index.tsx` — loads + displays linked CVs

## Dependencies Added
- @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, mammoth, pdf-parse, @types/pdf-parse

## Key Learnings
- TanStack Start ServerFn transforms `unknown` → `{}` in serialized types; use `Record<string, {}>` cast for JSONB metadata
- Effect.Service `dependencies` array must include ALL layers yielded in `effect` callback for proper type inference
- pdf-parse v2 uses class-based API: `new PDFParse({ data })` → `.getText()` → `.destroy()`
