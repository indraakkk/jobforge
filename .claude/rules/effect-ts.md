---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
  - "!src/routes/**/*.tsx"
---

# Effect TS Rules

These rules auto-activate when editing TypeScript files in `src/` (excluding route components).

## Error Types
- All errors must extend `Schema.TaggedError` — never plain `Error` classes
- Error types live in `src/lib/errors/` organized by module
- Every error must have a unique `_tag` string

## Service Pattern
- Services use `Context.Tag` → `Layer.succeed` pattern
- Service interfaces define methods returning `Effect.Effect<A, E, R>`
- Live implementations in separate `*Live` Layer exports
- Services live in `src/lib/services/`

## Gen vs Pipe
- Use `Effect.gen` for sequential operations (multiple yield* steps)
- Use `pipe` for linear transformations (map, flatMap, catchTag chains)
- Never use `.then()` — always Effect combinators

## TryPromise Boundaries
- `Effect.tryPromise` ONLY at external API boundaries
- Always provide `catch` handler that maps to a tagged error
- Never use bare `Effect.tryPromise(() => ...)` without error mapping

## Config
- Use `Config.string()`, `Config.number()`, `Config.boolean()` for env vars
- Never use `process.env` directly
- Never use `dotenv` — Bun loads `.env` automatically
- Config values accessed via `Effect.gen` + `yield* Config.string("VAR")`

## Imports
- Import from `effect` for core types: `Effect`, `Layer`, `Context`, `Config`, `Schema`, `Data`
- Import from `@effect/sql` for SQL utilities
- Import from `@effect/sql-pg` for PostgreSQL client
