# Phase 1 — Routes & Components

## Routes (src/routes/applications/)

### /applications (index.tsx)
- List page with status filter tabs (All, Applied, Screening, Interviewing, Offers, Drafts, Rejected, Withdrawn)
- Search input (company/role)
- Pagination
- Table: Company, Role, Status, Location, Applied date
- Search params: `{ status?, search?, page? }`
- Loader calls `getApplications` server function

### /applications/$id ($id.tsx)
- Detail page showing full application data
- StatusBadge + StatusPipeline components
- Edit and Delete buttons
- DetailCard helper component for layout
- Loader calls `getApplication` server function

### /applications/new (new.tsx)
- Create form using ApplicationForm component
- On submit calls `createApplication`, navigates to detail page

### /applications/$id/edit ($id/edit.tsx)
- Edit form using ApplicationForm with prefilled data
- Loader calls `getApplication` for current data
- On submit calls `updateApplication`, navigates to detail page

## Components (src/components/)

### ApplicationForm.tsx
- Reusable form for create/edit
- Props: `{ onSubmit, submitLabel, defaultValues?, onCancel? }`
- Interface: ApplicationFormData (14 fields matching CreateApplication)
- Status dropdown, text inputs, textarea for notes/job_description
- Uses @/components/ui/input (shadcn)

### StatusBadge.tsx
- Color-coded badge per status
- `statusConfig` maps each of 8 statuses to colors

### StatusPipeline.tsx
- Visual pipeline showing progression: Applied → Screening → Interviewing → Offer → Accepted
- Terminal statuses: rejected, withdrawn, draft (shown differently)
- 6 steps with active/completed/terminal states

## UI Components (src/components/ui/) — shadcn
sheet, tooltip, breadcrumb, avatar, sidebar, separator, button, collapsible, dropdown-menu, input, skeleton

## Layout Components
- nav-main.tsx — navigation menu
- app-sidebar.tsx — sidebar layout
