# Phase 4: AI CV Tailor

**Goal:** In-app AI-powered CV tailoring. Agent analyzes job description + base CV, produces tailored version.

## Auth model — pivoted from Agent SDK to local CLI subprocess

This phase originally specced `@anthropic-ai/claude-agent-sdk` + `ANTHROPIC_API_KEY`. **We pivoted**: the codebase now spawns the user's local `claude` binary as a child process via `Bun.spawn` directly inside the Bun runtime that serves the app. The binary reads its own credentials from `~/.claude/`. This is the same pattern Paperclip and T3 Code use; Anthropic considers it compliant with the April 2026 Consumer Terms update that banned third-party tools from using OAuth tokens directly.

**Consequences:**
- No `ANTHROPIC_API_KEY` required — users on a Claude Code subscription don't burn API credits.
- The harness never touches an OAuth token; the spawned binary handles auth.
- To force API billing instead, set `ANTHROPIC_API_KEY` in the dev server's environment — the spawned binary picks it up automatically.
- Streaming uses `--output-format stream-json --verbose --include-partial-messages` and SSE-frames each line back to the browser via the same-origin route `/api/ai/stream`.

## Prerequisites
- Phase 3 complete (CV manager with text extraction working)
- `claude` CLI installed and authenticated (`claude /login` once)

## Tasks

### 1. Dependencies
Zod is still pulled in for Tanstack Form schemas; no Agent SDK install.
```bash
bun add zod  # already present
```

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

### 3. Custom MCP tools (deferred — see follow-up)
Originally planned: agent calls MCP tools to fetch JD / CV / Q&A and save the tailored variant itself. Not required for the current single-prompt analysis flow (we hand the agent the CV + JD inline). When we want the agent to roam multi-turn, register an MCP server via `--mcp-config` on the proxy and pass `--allowedTools mcp__jobforge__*`. Each tool wraps an existing Effect service (`CVService`, `QAService`, `ApplicationService`) and uses Zod at the MCP boundary.

| Tool | Input (Zod) | What it does (Effect internally) |
|------|-------------|----------------------------------|
| `get_job_description` | `{ application_id }` | Fetch JD text from applications table |
| `get_cv_text` | `{ cv_id }` | Fetch extracted text from cv_files |
| `get_qa_entries` | `{ application_id }` | Fetch Q&A entries for context |
| `save_tailored_cv` | `{ text, name, parent_id, application_id }` | Save as new CV variant |

### 4. Tailoring system prompt
Build a system prompt that instructs the agent to:
1. Fetch the job description
2. Fetch the base CV text
3. Optionally fetch relevant Q&A entries
4. Analyze alignment between CV and JD
5. Produce a tailored CV version
6. Save the result as a variant

### 5. Streaming (implemented)
`src/server/functions/ai.ts` exposes:
- `prepareAIStream({ baseCvId, jobDescription, applicationId? })` — validates CV, builds prompts, inserts pending `ai_sessions` row, returns `{ sessionId, systemPrompt, userPrompt, model, proxyUrl }`.
- `finalizeAIStream({ sessionId, rawResponse, inputTokens, outputTokens })` — parses the captured response JSON, updates the session row to `completed`.

The browser hits the proxy's `/ask/stream` endpoint directly with the prompt, reads SSE frames, accumulates `content_block_delta` text events for live display, then calls `finalizeAIStream` when the stream's `result` event lands. This avoids needing a TanStack Start streaming-aware route handler (not yet exposed in v1.114).

Lifecycle (Paperclip-style): `armLifecycle` (in `src/lib/services/claudeCli/spawn.ts`) sends `SIGTERM` after `CLAUDE_TIMEOUT_SEC` (default 900s) and `SIGKILL` `CLAUDE_GRACE_SEC` later (default 30s). Browser disconnect cancels the underlying child via the ReadableStream `cancel` hook in `/api/ai/stream`.

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
- [x] Tailoring produces a new CV variant (`/cv/tailor` → Accept and Save)
- [x] SSE streaming shows agent progress in real-time (`prepareAIStream` → proxy `/ask/stream` → live text)
- [x] Session history with token tracking (`/cv/tailor/history`, `ai_sessions` table)
- [x] CLI subprocess auth — no API key required
- [ ] Agent can fetch JD, CV, and Q&A via custom MCP tools (deferred to follow-up)
- [ ] Cost calculation per session (deferred — needs per-model price table)
