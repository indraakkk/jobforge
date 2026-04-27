# Architecture

A snapshot of how JobForge is wired today, after the Phase 4 pivot from the
Anthropic Agent SDK to a local `claude` CLI subprocess.

For the original product spec see [`JOBFORGE.md`](../JOBFORGE.md). For the
working agreement (conventions, do/don't lists, skills, agents) see
[`CLAUDE.md`](../CLAUDE.md). For phase-by-phase progress see
[`docs/phase-*.md`](.).

## Layered view

```
┌─────────────────────────────────────────────────────────────┐
│ Browser (React, TanStack Router)                            │
│   src/routes/**, src/components/**                          │
└──────────────┬──────────────────────────────────────────────┘
               │ server functions  /  fetch /api/ai/stream
┌──────────────▼──────────────────────────────────────────────┐
│ TanStack Start (SSR, file routes, server functions)         │
│   src/server/functions/**, src/routes/api/**                │
└──────────────┬──────────────────────────────────────────────┘
               │ Effect.runPromise(program.pipe(Effect.provide(AppLive)))
┌──────────────▼──────────────────────────────────────────────┐
│ Effect services (functional core)                           │
│   src/lib/services/**, src/lib/layers/**                    │
└──────┬───────────────┬──────────────┬───────────────────────┘
       │               │              │
       ▼               ▼              ▼
   Postgres        MinIO          claude CLI
  (@effect/sql-pg) (S3 client)    (Bun.spawn subprocess)
```

The runtime is Bun. There is no Node, no Next.js, no Express.

## Effect boundary

Effect TS lives **only** in `src/lib/` and `src/server/`. React components do
not import from `effect`, never call `Effect.runPromise`, and never see a
`Layer`. The bridge is a server function:

```ts
// src/server/functions/<module>.ts
export const someFn = createServerFn(...).handler(async (input) => {
  const program = SomeService.pipe(
    Effect.flatMap((svc) => svc.doThing(input)),
  );
  return Effect.runPromise(program.pipe(Effect.provide(AppLive)));
});
```

The component imports `someFn` and calls it like any async function. Effect
errors are caught at the boundary and either rethrown as plain `Error`s or
returned as discriminated results, depending on the call site.

## Data stores

Postgres tables (numbered migrations in [`db/migrations/`](../db/migrations)):

| Table | Purpose |
|---|---|
| `applications` | One row per job application; status pipeline |
| `qa` | Q&A vault entries with full-text search |
| `cv_versions` | CV uploads + tailored variants (parent / child relationship) |
| `ai_sessions` | One row per AI tailoring run; tracks tokens + status |

MinIO (S3-compatible) holds the raw CV files (PDF / DOCX). Text extraction
runs once at upload time and the extracted text is persisted alongside the
object key in `cv_versions`.

SQL is always tagged template literals via `@effect/sql-pg` — no ORM, no
query builders. Decoding happens at the repository boundary using
`Schema.decode`.

## Claude CLI adapter

The adapter spawns the user's local `claude` binary. It does **not** import
`@anthropic-ai/claude-agent-sdk` and does **not** require an
`ANTHROPIC_API_KEY` to function. The binary handles its own auth via
`~/.claude/`.

There are two paths:

### Non-streaming — `ClaudeCliService.ask`

Used by JD import and one-shot CV analyses. Spawns:

```
claude -p "<prompt>" --output-format json --model sonnet --no-session-persistence
```

Waits for the child to exit, decodes stdout against the
`ClaudeResponse` schema in `src/lib/schemas/claude.ts`, returns the result.

### Streaming — `POST /api/ai/stream`

Used by the `/cv/tailor` UI. Spawns:

```
claude -p "<prompt>" --output-format stream-json --verbose --include-partial-messages \
  --model sonnet --no-session-persistence
```

Each line of stdout is a JSON event (typed in
[`src/lib/schemas/claudeStream.ts`](../src/lib/schemas/claudeStream.ts)):

| Event | Purpose |
|---|---|
| `system` (init) | Handshake; session id, model, tools |
| `stream_event` → `content_block_delta` | Token-level deltas; accumulated for live display |
| `stream_event` → `message_delta` | Final stop reason + token usage |
| `result` | Canonical final response (use this, not the accumulated deltas) |

The route wraps each line as an SSE frame (`data: <line>\n\n`) and flushes
it to the browser. The browser parses events with a minimal SSE reader,
displays text deltas live, and on `result` saves the final structured
analysis.

## AI flow walkthrough — CV tailor

1. **UI** (`src/routes/cv/tailor/index.tsx`) calls
   `prepareAIStream({ baseCvId, jobDescription, applicationId? })`.
2. **Server function** (`src/server/functions/ai.ts`) validates the CV,
   builds system + user prompts, inserts a pending row into `ai_sessions`,
   returns `{ sessionId, systemPrompt, userPrompt, model }`.
3. **Browser** opens an SSE stream with `fetch("/api/ai/stream", { ... })`
   and starts reading the response body.
4. **Route** (`src/routes/api/ai/stream.ts`) calls `Bun.spawn` with the
   stream-json flags and arms a Paperclip-style lifecycle (see below).
5. **Live deltas** stream back; the browser concatenates them into the
   visible "thinking" pane.
6. **`result` event** lands; the browser calls
   `finalizeAIStream({ sessionId, rawResponse, inputTokens, outputTokens })`,
   which parses the JSON and updates the session row to `completed`.
7. **Accept and save** — the user can save the suggested CV as a new variant
   linked to the parent CV (and optionally the application).

## Process lifecycle

Owned by [`src/lib/services/claudeCli/spawn.ts`](../src/lib/services/claudeCli/spawn.ts).

- `buildArgs(prompt, options, format)` constructs the argv consistently for
  both paths.
- `armLifecycle(proc, opts)` schedules:
  - `SIGTERM` after `CLAUDE_TIMEOUT_SEC` seconds (default `900`).
  - `SIGKILL` after a further `CLAUDE_GRACE_SEC` seconds (default `30`).
- The streaming route also wires `ReadableStream.cancel` to `proc.kill("SIGTERM")`
  so a browser disconnect tears the child down immediately.

## Error model

All errors extend `Schema.TaggedError` with a unique `_tag`. Modules:

- [`src/lib/errors/claude.ts`](../src/lib/errors/claude.ts) — CLI spawn,
  exit codes, JSON decode, schema decode.
- [`src/lib/errors/ai.ts`](../src/lib/errors/ai.ts) — session lifecycle,
  prompt validation.
- One file per domain in [`src/lib/errors/`](../src/lib/errors/), re-exported
  from `index.ts`.

No `try` / `catch` in business logic. Failures route through the Effect
error channel and are funneled at the server-function boundary.

## Configuration

- App config: `Config.string()` / `Config.number()` from `effect`. Never
  `process.env` directly (the only sanctioned exception is the
  `JobImportService` Agent SDK subprocess env passthrough; see CLAUDE.md).
- CLI knobs (consumed by `spawn.ts`):
  - `CLAUDE_BIN` — path to the binary (default `claude`).
  - `CLAUDE_MODEL` — model name passed to `--model` (default `sonnet`).
  - `CLAUDE_TIMEOUT_SEC` — soft kill deadline.
  - `CLAUDE_GRACE_SEC` — hard kill grace window.
  - `ANTHROPIC_API_KEY` — **optional**. If set in the dev server env, the
    spawned binary picks it up and bills the API key instead of the
    subscription. Not required by default.

None of the CLI knobs are secrets; they exist so a CI environment can pin
the binary path or shorten timeouts.

## What is intentionally not here

- **No API key in the default flow.** Auth is the `claude` binary's
  responsibility.
- **No MCP tools yet.** The original Phase 4 plan had the agent fetching JD,
  CV, and Q&A through MCP tools; we currently inline everything into a
  single prompt. Restoring this is a follow-up — see
  [`docs/phase-4-ai-tailor.md`](./phase-4-ai-tailor.md).
- **No per-session cost calculation.** Tokens are persisted; turning them
  into dollars needs a per-model price table that is out of scope.
- **No tests for the streaming path yet.** The non-streaming path is
  exercised through the existing service tests; SSE end-to-end coverage
  is a follow-up.
