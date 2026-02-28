# Phase 0: Effect TS Playground

**Goal:** Run all 7 Effect TS lessons from JOBFORGE.md. Verify assumptions about @effect/sql-pg on Bun before writing any application code.

## Prerequisites
- Bun installed (via nix develop or standalone)
- No Docker needed for this phase

## Tasks

### 1. Create playground project
```bash
mkdir effect-playground && cd effect-playground
bun init
bun add effect
```

### 2. Work through Lessons 1-7
Each lesson is a standalone `.ts` file. Run with `bun <file>.ts`.

| # | File | Concept |
|---|------|---------|
| 1 | `01-effect-vs-promise.ts` | Effect as description vs Promise as execution |
| 2 | `02-errors-that-dont-lie.ts` | Tagged errors, error channel, catchTag |
| 3 | `03-pipe-and-gen.ts` | pipe for transforms, gen for sequences |
| 4 | `04-services-and-layers.ts` | Context.Tag, Layer.succeed, dependency injection |
| 5 | `05-real-world-tryPromise.ts` | Wrapping external calls at boundary |
| 6 | `06-config.ts` | Config.string, Config.number for env vars |
| 7 | `07-schema.ts` | Schema classes, decode, runtime validation |

### 3. Verify @effect/sql-pg assumptions
```bash
bun add @effect/sql @effect/sql-pg @effect/platform-bun
```

Test these specific questions:
1. Does `BunContext.layer` exist in `@effect/platform-bun`, or must we use `NodeContext`?
2. Is `Schema.UUID` built-in or needs custom branded type?
3. `Schema.optionalWith` nullable syntax — exact API for nullable optional fields
4. Do `.ts` migration files work with `PgMigrator.fromFileSystem()` on Bun?
5. Does `sql.insert()` accept Schema class instances directly or needs `.fields`?
6. Does `sql<Type>` generic do runtime validation or just type casting?

### 4. Document findings
Record answers to the 6 verification questions. These inform Phase 1 implementation.

## Deliverables
- [ ] All 7 lesson files run successfully with Bun
- [ ] Can write Effect.gen, use pipe, define TaggedErrors
- [ ] Can create Services with Layers
- [ ] Can wrap Promises with tryPromise
- [ ] 6 verification questions answered with code evidence
- [ ] Findings documented for Phase 1
