# Phase 2: Q&A Vault

**Goal:** Store and search Q&A entries, linked to applications. Full-text search with PostgreSQL.

## Prerequisites
- Phase 1 complete (app running, DB connected, Application Tracker working)

## Tasks

### 1. Database migration
`db/migrations/0002_create_qa_entries.sql`:
```sql
CREATE TABLE qa_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_qa_search ON qa_entries USING GIN(search_vector);
CREATE INDEX idx_qa_application ON qa_entries(application_id);
CREATE INDEX idx_qa_tags ON qa_entries USING GIN(tags);
```

### 2. Full-text search trigger
`db/migrations/0003_add_fts_trigger.sql`:
- Create trigger function to update `search_vector` on INSERT/UPDATE
- Vector weights: question (A), answer (B), tags (C)

### 3. Error types
`src/lib/errors/qa.ts`:
- `QANotFoundError`
- `QAValidationError`

### 4. Q&A service
Effect service with methods:
- `create(input)` — create Q&A entry
- `findById(id)` — get single entry
- `findByApplication(applicationId)` — entries for an application
- `search(query, tags?)` — full-text search with optional tag filter
- `update(id, input)` — update entry
- `delete(id)` — delete entry
- `listTags()` — get all unique tags

### 5. Server functions
`src/server/functions/qa.ts`:
- `getQAEntries` — list/search with query + tag filters
- `getQAEntry` — by ID
- `createQAEntry` — with application linking
- `updateQAEntry` — partial update
- `deleteQAEntry`

### 6. Routes
- `/qa` — Q&A list page with search bar + tag filter
- `/qa/$id` — Q&A detail/edit page
- `/qa/new` — create Q&A form (with optional application selector)
- Embed Q&A section in `/applications/$id` detail page

### 7. UI features
- Search bar with debounced full-text search
- Tag pills for filtering (click to toggle)
- Copy-to-clipboard button on answers
- Link to parent application (if linked)

## Deliverables
- [ ] Q&A CRUD working end-to-end
- [ ] Full-text search returns relevant results
- [ ] Tag filtering works independently and with search
- [ ] Q&A entries visible on application detail page
- [ ] Copy-to-clipboard on answers
- [ ] All server functions use Effect, tagged errors, Schema validation
