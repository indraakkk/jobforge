# Phase 1 — Schemas (src/lib/schemas/application.ts)

## ApplicationStatus (Schema.Literal)
Values: `"draft" | "applied" | "screening" | "interviewing" | "offer" | "accepted" | "rejected" | "withdrawn"`

## Application (Schema.Class)
Fields: id, company, role, url?, status, job_description?, salary_range?, location?, platform?, contact_name?, contact_email?, notes?, applied_at?, next_action?, next_action_date?, created_at, updated_at
- Nullable fields use `Schema.NullOr(Schema.String)`
- Date fields use `DateToString` custom schema (encode/decode between Date and string)

## CreateApplication (Schema.Class)
Required: company, role
Optional (with `null` defaults): url, status (default "draft"), job_description, salary_range, location, platform, contact_name, contact_email, notes, applied_at, next_action, next_action_date

## UpdateApplication (Schema.Class)
All fields optional (partial update): company?, role?, url?, status?, job_description?, salary_range?, location?, platform?, contact_name?, contact_email?, notes?, applied_at?, next_action?, next_action_date?

## PaginatedResult<T> (plain class, not Schema)
Fields: items (ReadonlyArray<T>), total, page, pageSize
Getter: totalPages (computed from total/pageSize)

## Interfaces
- `ApplicationFilters` — `{ status?: string, search?: string }`
- `ApplicationSort` — `{ field?: string, direction?: string }`
- `ApplicationStats` — `{ total: number, byStatus: Record<string, number> }`
