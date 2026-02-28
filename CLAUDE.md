# JobForge — Claude Code Instructions

> Job hunting toolkit: application tracker, Q&A vault, CV manager, AI tailor.

## Commands

```bash
bun dev              # Start dev server (TanStack Start + Bun)
bun install          # Install dependencies
bun test             # Run tests (bun:test)
bun db:migrate       # Run database migrations
bun db:seed          # Seed database with sample data
docker compose up -d # Start PostgreSQL + MinIO
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Bun |
| Framework | TanStack Start (React, file-based routing) |
| Functional core | Effect TS |
| Database | PostgreSQL via @effect/sql-pg |
| File storage | MinIO (S3-compatible) |
| AI | Claude Agent SDK (@anthropic-ai/claude-agent-sdk) |
| Styling | Tailwind CSS |
| Testing | bun:test |

## Architecture Rules

### Effect Boundary
- Effect TS lives ONLY in `src/lib/` and `src/server/` — never in React components
- Server functions (`src/server/functions/`) bridge React ↔ Effect
- Server functions call Effect programs via `Effect.runPromise` and return plain data to React

### Error Handling
- All errors extend `Schema.TaggedError` with unique `_tag`
- Error types organized by module in `src/lib/errors/`
- Use `Effect.catchTag` for specific error handling
- Never use try/catch — use Effect's error channel

### Services and Layers
- Services use `Context.Tag` → `Layer.succeed` pattern
- Service files in `src/lib/services/`
- Layer composition in `src/lib/layers/`
- Test layers alongside test files

### SQL
- Tagged template literals only: `` sql`SELECT ...` ``
- No ORM, no query builders
- Schema decode at repository boundary
- Migrations in `db/migrations/` as numbered `.sql` files

### Config
- `Config.string()` / `Config.number()` — never `process.env`
- Bun loads `.env` automatically — no dotenv

## Project Structure

```
src/
  routes/          # TanStack file-based routes (React components)
  lib/
    errors/        # Tagged error types by module
    services/      # Effect service definitions + Layer implementations
    layers/        # Composed Layer exports (AppLive, TestLive)
  server/
    functions/     # Server functions (Effect → plain data bridge)
db/
  migrations/      # Numbered SQL migration files
  schema/          # Schema documentation
docs/              # Phase plans and architecture docs
```

## Skills (invoke with `/command`)

| Command | Purpose | Agent |
|---------|---------|-------|
| `/karpathy-guidelines` | Code quality review, anti-over-engineering | karpathy-agent |
| `/frontend-design` | Distinctive UI design, anti-slop aesthetics | frontend-design-agent |
| `/meta-cognitive` | Structured reasoning for complex decisions | fprompt |
| `/audit-plan` | Audit a plan before execution | karpathy-agent |
| `/full-build` | End-to-end: audit → reason → implement → review | orchestrated |

## Subagent Strategy

- **Use subagents liberally** — one focused task per subagent
- **Offload research**: "Use a subagent to explore how X works" keeps main context clean
- **Post-implementation review**: "Use code-reviewer to review my changes"
- **Effect validation**: "Use effect-validator to check this module"
- **Parallel work**: "Use task-coordinator to implement [feature]" for 3+ file features
- **Resume agents**: Follow up with the same agent for related work

## Plan Mode

- **Always plan first** for non-trivial tasks (3+ files, new modules, architectural decisions)
- Enter plan mode, read relevant phase docs from `docs/`, create todo list
- If implementation goes sideways, stop and re-plan — don't brute-force
- Ask clarifying questions before committing to an approach
- Write verifiable success criteria in the plan

## Phase Docs

Read the relevant phase doc before implementing features:
- `docs/phase-0-effect-playground.md` — Effect TS learning exercises
- `docs/phase-1-foundation.md` — Project setup + Application Tracker
- `docs/phase-2-qa-vault.md` — Q&A storage + search
- `docs/phase-3-cv-manager.md` — CV upload + versioning
- `docs/phase-4-ai-tailor.md` — AI-powered CV tailoring

## Do NOT

- Use Node.js APIs — use Bun equivalents
- Use any ORM (Drizzle, Prisma, etc.) — use @effect/sql-pg
- Use Zod for DB validation — use Effect Schema
- Use try/catch — use Effect error channel
- Use `process.env` — use Effect Config
- Use Effect in React components — keep it server-side
- Use dotenv — Bun handles .env natively
- Add features not in the current phase plan
- Over-engineer — read Karpathy guidelines first
