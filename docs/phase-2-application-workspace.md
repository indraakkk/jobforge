# Phase 2: Application Workspace

**Goal:** Evolve the application tracker into a rich workspace with AI-powered JD
import, dynamic Q&A, markdown editing, and split-screen layout.

## Prerequisites
- Phase 1 complete (app running, DB connected, Application Tracker working)
- ANTHROPIC_API_KEY in .env (for Claude Agent SDK)

## Tasks

### 1. Automated JD Import (Claude Agent SDK)
- Install @anthropic-ai/claude-agent-sdk + zod
- JobImportService: takes any job posting URL, returns structured data
- Agent uses WebFetch tool to read the page
- Zod schema for structured output: company, role, location, salary,
  description (markdown), application questions
- Server function: importJobFromUrl

### 2. Database: Q&A entries
- Migration 0002: qa_entries table (application_id NOT NULL FK CASCADE)
- Migration 0003: FTS trigger (question=A, answer=B, tags=C)
- QAService: CRUD + full-text search + tag filtering

### 3. Better Forms (TanStack Form + Zod)
- Install @tanstack/react-form
- Zod schemas for client-side form validation
- Migrate ApplicationForm to TanStack Form
- Field-level validation and error display

### 4. Markdown JD Editor
- Install @uiw/react-md-editor + turndown
- MarkdownEditor component (edit with toolbar)
- MarkdownRenderer component (read-only display)
- HTML-to-markdown conversion for imported JDs

### 5. Application Creation — Two Modes
- /applications/new with [Automated] [Manual] tabs
- Automated: paste URL -> AI imports -> review -> create app + Q&A entries
- Manual: traditional form with markdown editor for JD

### 6. Application Workspace (split-screen)
- /applications/$id becomes split layout
- Left: JD (markdown) + Q&A section (inline add/edit)
- Right: CV preview panel (placeholder for Phase 3)

### 7. Q&A Browse
- /qa — search/browse Q&A across all applications
- Full-text search + tag filtering
- /qa/$id, /qa/$id/edit, /qa/new routes

## Deliverables
- [x] Paste any job URL -> AI extracts JD + questions -> creates application
- [x] Manual application creation with markdown JD editor
- [x] Split-screen workspace: JD + Q&A left, CV placeholder right
- [x] Inline add/edit Q&A on application detail page
- [x] Q&A browse with full-text search + tag filter
- [x] Copy-to-clipboard on Q&A answers
- [x] TanStack Form + Zod validation on all forms
- [x] All server functions use Effect, tagged errors, Schema validation
