# Phase 4: AI CV Tailor

**Goal:** In-app AI-powered CV tailoring using Claude Agent SDK. Agent analyzes job description + base CV, produces tailored version.

## Prerequisites
- Phase 3 complete (CV manager with text extraction working)
- `ANTHROPIC_API_KEY` set in `.env`

## Tasks

### 1. Install Agent SDK
```bash
bun add @anthropic-ai/claude-agent-sdk zod
```

Note: Zod is required by Agent SDK for tool input schemas. Effect Schema is still used for all DB validation.

### 2. Database migration
`db/migrations/0005_create_ai_sessions.sql`:
```sql
CREATE TABLE ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  cv_file_id UUID REFERENCES cv_files(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  system_prompt TEXT,
  result_text TEXT,
  result_cv_id UUID REFERENCES cv_files(id) ON DELETE SET NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_sessions_application ON ai_sessions(application_id);
```

### 3. Custom MCP tools
Create MCP tools that the agent can call (using Effect internally, Promise at SDK boundary):

| Tool | Input (Zod) | What it does (Effect internally) |
|------|-------------|----------------------------------|
| `get_job_description` | `{ application_id }` | Fetch JD text from applications table |
| `get_cv_text` | `{ cv_id }` | Fetch extracted text from cv_files |
| `get_qa_entries` | `{ application_id }` | Fetch Q&A entries for context |
| `save_tailored_cv` | `{ text, name, parent_id, application_id }` | Save as new CV variant |

Each tool:
- Defines input with Zod (Agent SDK requirement)
- Internally runs Effect program via `Effect.runPromise`
- Returns plain data to the agent

### 4. Tailoring system prompt
Build a system prompt that instructs the agent to:
1. Fetch the job description
2. Fetch the base CV text
3. Optionally fetch relevant Q&A entries
4. Analyze alignment between CV and JD
5. Produce a tailored CV version
6. Save the result as a variant

### 5. Server function with SSE streaming
`src/server/functions/ai.ts`:
- `tailorCV(applicationId, cvId)` — starts agent session
- Uses SSE to stream agent responses to the client
- Tracks token usage per session
- Saves session metadata to `ai_sessions` table

### 6. Error types
`src/lib/errors/ai.ts`:
- `AISessionError`
- `AIRateLimitError`
- `AITokenLimitError`

### 7. Routes
- `/ai` — AI tailor workspace
  - Select application (with JD preview)
  - Select base CV
  - Start tailoring session
  - Stream agent output in real-time
  - Show analysis + tailored CV side by side
- `/ai/sessions` — past session history with cost tracking

### 8. Session persistence
- Save session start/end to `ai_sessions`
- Track input/output tokens
- Calculate cost (based on Claude model pricing)
- Link result CV variant to session

## Deliverables
- [ ] Agent can fetch JD, CV, and Q&A via custom MCP tools
- [ ] Tailoring produces a new CV variant
- [ ] SSE streaming shows agent progress in real-time
- [ ] Session history with token/cost tracking
- [ ] All Effect services work at tool boundary
- [ ] Zod used ONLY for MCP tool schemas, Effect Schema for everything else
