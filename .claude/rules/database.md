---
paths:
  - "db/**/*"
  - "src/**/repo*"
---

# Database Rules

These rules auto-activate when editing database files or repository modules.

## SQL Only — No ORM
- Use `@effect/sql-pg` with tagged template literals: `` sql`SELECT ...` ``
- Never use an ORM (Drizzle, Prisma, TypeORM, etc.)
- Never use query builders — write raw SQL

## Tagged Template SQL
```typescript
// ✅ CORRECT
const users = yield* sql`SELECT * FROM users WHERE id = ${userId}`

// ❌ WRONG — string concatenation
const users = yield* sql(`SELECT * FROM users WHERE id = '${userId}'`)
```

## Schema Validation
- Use `Effect Schema` to decode query results, never Zod
- Define row schemas matching your SQL table structure
- Validate at the repository boundary

## Migration Format
- Migrations live in `db/migrations/`
- Named: `NNNN_description.sql` (e.g., `0001_create_applications.sql`)
- Each migration is idempotent where possible
- Always include both up and down in comments

## Transactions
- Use `sql.withTransaction` for multi-statement operations
- Never manually BEGIN/COMMIT
- Keep transactions short — no external API calls inside transactions

## Repository Pattern
- Repository functions live in `src/lib/services/` as Effect services
- Each returns `Effect.Effect<Result, TaggedError, SqlClient>`
- Repository is a thin layer: SQL query → Schema decode → return
