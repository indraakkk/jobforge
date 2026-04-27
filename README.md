# JobForge

A local-first job-hunting toolkit: application tracker, Q&A vault, CV
manager, and AI-powered CV tailoring. Runs on your machine, talks to a
local Postgres, stores files in a local MinIO, and uses your own
authenticated `claude` CLI for AI work.

For the long-form product spec see [`JOBFORGE.md`](./JOBFORGE.md). For the
working agreement (conventions, do/don't lists, agents, skills) see
[`CLAUDE.md`](./CLAUDE.md). For the current data flow see
[`docs/architecture.md`](./docs/architecture.md).

## Quick start

Prerequisites:

- [Bun](https://bun.sh)
- Docker (for Postgres + MinIO)
- The `claude` CLI installed and signed in (`claude /login`) — only needed
  if you want to use the AI tailor.

```bash
docker compose up -d   # Postgres + MinIO
bun install
bun db:migrate
bun db:seed            # optional, seeds sample applications
bun dev                # http://localhost:3000
```

Run tests with `bun test`.

## Architecture at a glance

| Layer | Technology |
|---|---|
| Runtime | Bun |
| Framework | TanStack Start (React, file-based routing, server functions) |
| Functional core | Effect TS |
| Database | PostgreSQL via `@effect/sql-pg` |
| File storage | MinIO (S3-compatible) |
| AI | Local `claude` CLI subprocess |
| Styling | Tailwind CSS + shadcn/ui |
| Tests | `bun:test` |

Effect TS lives only in `src/lib/` and `src/server/`. React components
never call `Effect.runPromise`; the bridge is a server function in
`src/server/functions/`. SQL is tagged template literals — no ORM. Errors
are `Schema.TaggedError` discriminated unions, never `try` / `catch`.

See [`docs/architecture.md`](./docs/architecture.md) for the layered view,
data flow, and process lifecycle.

## Claude CLI adapter

The AI tailoring features (JD import, CV analysis, CV tailoring) do **not**
use the Anthropic Agent SDK. They invoke your local `claude` binary as a
child process via `Bun.spawn`, inside the same Bun runtime that serves the
app.

### What it is

A thin adapter (`src/lib/services/ClaudeCliService.ts` and
`src/lib/services/claudeCli/spawn.ts`) that runs `claude` with a prompt
and either:

- waits for the JSON response (`--output-format json`), or
- streams `--output-format stream-json --verbose --include-partial-messages`
  line-by-line through the same-origin route `/api/ai/stream`, which frames
  each line as a Server-Sent Event for the browser.

That's the whole adapter. There is no proxy server, no token store, no
intermediate service.

### What it does NOT do

- It does **not** read or transmit credentials from `~/.claude/`. The
  `claude` binary owns its own auth; the adapter only spawns the process.
- It does **not** capture, store, or replay OAuth tokens. None of those
  values cross the adapter boundary.
- It does **not** proxy other people's traffic. Everything runs locally
  against the user's own binary on the user's own machine.
- It does **not** impersonate Claude Code's UI, branding, or features.
  JobForge is a separate application that happens to use a CLI you already
  have installed.

### Why this design

It avoids holding an OAuth token at all, which is the core constraint of
Anthropic's April 2026 Consumer Terms update for Claude Code. The user's
authenticated CLI is the auth surface; the app is just a caller. The same
pattern is used by other local-first tools that integrate with Claude
Code.

If you'd rather bill against an API key — for instance on a server that
doesn't have an interactive Claude Code login — set `ANTHROPIC_API_KEY` in
the dev server's environment. The spawned `claude` binary picks it up
automatically and bills that key instead of any subscription credits.

### Knobs

All optional; consumed by `src/lib/services/claudeCli/spawn.ts`.

| Env var | Default | Meaning |
|---|---|---|
| `CLAUDE_BIN` | `claude` | Path to the CLI binary |
| `CLAUDE_MODEL` | `sonnet` | Value passed to `--model` |
| `CLAUDE_TIMEOUT_SEC` | `900` | SIGTERM after this many seconds |
| `CLAUDE_GRACE_SEC` | `30` | SIGKILL this many seconds after SIGTERM |
| `ANTHROPIC_API_KEY` | unset | Force API-key billing instead of subscription |

None of these are secrets.

### Disclaimer

JobForge is not affiliated with Anthropic. The adapter invokes a CLI you
already installed and authenticated; it adds no new auth surface and ships
no credentials. If you are unsure whether your specific use case is
permitted under the current Anthropic Consumer Terms, please consult those
terms before running the AI features.

## Phase status

Build is staged into phases. Each phase has its own doc with goals and
deliverables:

- [Phase 0 — Effect playground](./docs/phase-0-effect-playground.md)
- [Phase 1 — Foundation + Application Tracker](./docs/phase-1-foundation.md) — complete
- [Phase 2 — Q&A Vault + JD import](./docs/phase-2-qa-vault.md) — complete
- [Phase 3 — CV manager](./docs/phase-3-cv-manager.md) — complete
- [Phase 4 — AI tailor](./docs/phase-4-ai-tailor.md) — in progress (CLI subprocess pivot)

## Repo layout

```
src/
  routes/          TanStack file routes (React)
  routes/api/      Server-only routes (e.g. /api/ai/stream)
  components/      React components
  lib/
    services/      Effect services (incl. claudeCli/)
    layers/        Composed Layer exports
    schemas/       Effect Schema + Zod schemas (form validation)
    errors/        Tagged error types per module
  server/
    functions/     Server functions (Effect → plain data bridge)
db/
  migrations/      Numbered SQL migrations
docs/              Phase plans, architecture, Effect patterns submodule
```

## Effect patterns

[`docs/effect-patterns/`](./docs/effect-patterns/) is a git submodule of
[PaulJPhilp/EffectPatterns](https://github.com/PaulJPhilp/EffectPatterns).
Run `bun patterns:update` to refresh it.
