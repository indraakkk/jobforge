# Effect TS Conventions

## Core Rules
- Effect TS lives ONLY in `src/lib/` and `src/server/` — never in React components
- Server functions (`src/server/functions/`) bridge React ↔ Effect via `Effect.runPromise`
- All errors extend `Schema.TaggedError` with unique `_tag`
- Services use `Context.Tag` → `Layer.succeed`/`Layer.effect` pattern (NOT `Effect.Service` — it's `@experimental`)
- Config via `Config.string()`/`Config.number()`/`Config.redacted()` — never `process.env`
- SQL: tagged template literals only — no ORM, no query builders
- Schema decode at repository boundary
- Zod for Agent SDK MCP tool schemas AND client-side TanStack Form validation; Effect Schema for everything else
- Shared schema transforms (e.g. `DateToString`) live in `src/lib/schemas/common.ts`

## Verified Patterns (audited against effect-mcp docs, March 2026)
- `Schema.Class<T>("Tag")({ fields })` — stable, documented API
- `Schema.TaggedError<T>()("Tag", { fields })` — valid call style
- `Context.Tag("Name")<Self, Interface>(){}` with `Layer.effect(Tag, Effect.gen(...))` — "type-first services" pattern
- `Schema.transform(from, to, { decode, encode })` — standard transformations
- `Effect.gen(function* () { ... })` with `yield*` — preferred generator style
- `yield* new ErrorClass({...})` — yieldable errors pattern
- `Effect.tryPromise({ try, catch })` — async error wrapping
- `Effect.runPromise(effect.pipe(Effect.provide(AppLive)))` — single provide at boundary
- `Layer.provideMerge` chain — standard layer composition
- `Config.redacted("KEY")` — for `@effect/sql-pg` layerConfig

## Effect.Service Status (Effect 3.19.19)
- Source JSDoc has `@experimental` annotation BUT official docs (effect.website) treat it as **stable and recommended**
- `Effect.Service` is the modern way to define services — simplifies Context.Tag + Layer boilerplate
- Our codebase currently uses `Context.Tag` + `Layer.effect` ("type-first services") — both patterns are valid
- Migration to `Effect.Service` is optional but recommended by official docs
- See: https://effect.website/docs/requirements-management/layers/#simplifying-service-definitions-with-effectservice

## Reference Material
- Full Effect TS patterns with code examples: `docs/effect-patterns/content/published/patterns/` (git submodule)
- 16 categories: building-apis, concurrency, core-concepts, domain-modeling, error-management, getting-started, making-http-requests, observability, platform, resource-management, scheduling, schema, streams, testing, tooling-and-debugging, building-data-pipelines
- Update with `bun patterns:update`
- Source: https://github.com/PaulJPhilp/EffectPatterns

## Future Patterns (not needed yet)
- `Effect.fn` — nice for observability, consider for Phase 4+
- `Model.Class` from `@effect/sql` — our `Schema.Class` approach is simpler and sufficient for now
- `Schema.DateTimeUtc` — our `DateToString` transform handles pg driver Date objects correctly