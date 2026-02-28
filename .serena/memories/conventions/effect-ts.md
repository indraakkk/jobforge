# Effect TS Conventions

- Effect TS lives ONLY in `src/lib/` and `src/server/` — never in React components
- Server functions (`src/server/functions/`) bridge React ↔ Effect via `Effect.runPromise`
- All errors extend `Schema.TaggedError` with unique `_tag`
- Services use `Context.Tag` → `Layer.succeed`/`Layer.effect` pattern
- Config via `Config.string()`/`Config.number()`/`Config.redacted()` — never `process.env`
- SQL: tagged template literals only (`sql\`SELECT ...\``) — no ORM, no query builders
- Schema decode at repository boundary
- Zod ONLY for Agent SDK MCP tool schemas; Effect Schema for everything else
