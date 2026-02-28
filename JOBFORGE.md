# JobForge — Job Hunting Toolkit (v2)

> A local-first web application for tracking job applications, managing CV versions, storing Q&A responses, and using the Anthropic API for AI-powered CV tailoring.
>
> **Runtime: Bun** | **Functional Core: Effect TS** | **Framework: TanStack Start**

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [What Changed from v1](#what-changed-from-v1)
3. [Tech Stack](#tech-stack)
4. [Effect TS Primer — Learn by Building](#effect-ts-primer--learn-by-building)
5. [Architecture Overview](#architecture-overview)
6. [Data Model](#data-model)
7. [Where Effect TS Lives in JobForge](#where-effect-ts-lives-in-jobforge)
8. [Module Breakdown](#module-breakdown)
9. [AI Integration (Anthropic API)](#ai-integration-anthropic-api)
10. [Infrastructure](#infrastructure)
11. [UI/UX Wireframes](#uiux-wireframes)
12. [Build Phases](#build-phases)

---

## Problem Statement

| #   | Pain Point                                                     | Solution                                                                                                                       |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | No record of which companies have been applied to              | **Application Tracker** — central log of every application with status pipeline                                                |
| 2   | Application Q&A answers get lost, then come back in interviews | **Q&A Vault** — store every question + answer, linked to applications, searchable                                              |
| 3   | CV needs tailoring per job but manual process is tedious       | **AI CV Tailor (Anthropic API)** — in-app agent analyzes JD + base CV, produces tailored version                               |
| 4   | Multiple CV versions exist but no way to find/reuse them       | **CV Version Manager** — base CV → variants, linked to applications, stored in MinIO                                           |
| 5   | Want local-first tooling that doubles as a learning playground | **Docker + Nix + MinIO + PostgreSQL + Effect TS** — production-grade local stack that teaches you advanced TypeScript patterns |

---

## What Changed from v1

| Area                | v1                                | v2                                                | Why                                                                          |
| ------------------- | --------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Runtime**         | Node.js 22                        | **Bun**                                           | 4x faster startup, native TS, built-in test runner, built-in package manager |
| **Package Manager** | pnpm                              | **bun** (built-in)                                | No separate tool needed, faster installs                                     |
| **Error Handling**  | try/catch + thrown errors         | **Effect TS**                                     | Type-safe errors, dependency injection, composable pipelines                 |
| **Service Layer**   | Plain functions                   | **Effect Services + Layers**                      | Testable, swappable implementations, explicit dependencies                   |
| **Config**          | `process.env` with manual parsing | **Effect Config**                                 | Type-safe env parsing, secrets, validation                                   |
| **Nix**             | Included Node.js + pnpm           | Now includes **Bun**                              | One binary replaces Node + pnpm + tsx                                        |
| **Test Runner**     | Vitest                            | **bun:test**                                      | Zero config, Jest-compatible API, faster                                     |
| **Database Layer**  | Drizzle ORM (assumed by Claude)   | **@effect/sql-pg** (raw SQL + Effect)             | No ORM — write real SQL, validate with Effect Schema, learn SQL properly     |
| **Validation**      | Zod everywhere                    | **Effect Schema** (DB) + **Zod** (Agent SDK only) | One less dependency, native Effect integration, same runtime validation      |

---

## Tech Stack

### Application Layer

| Technology                       | Purpose                                 | Why                                                                          |
| -------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------- |
| **Bun**                          | Runtime + Package Manager + Test Runner | All-in-one: runs TS natively, installs packages, runs tests — no extra tools |
| **TanStack Start**               | Full-stack framework                    | SSR + file-based routing, your preferred stack                               |
| **TypeScript**                   | Language                                | Type safety across the board                                                 |
| **TanStack Router**              | Routing                                 | Built into TanStack Start, type-safe routes                                  |
| **TanStack Query**               | Data fetching                           | Cache management, optimistic updates                                         |
| **@effect/sql + @effect/sql-pg** | Database layer (no ORM)                 | Tagged template SQL, Effect-native, built-in migrations, Schema validation   |
| **Effect TS**                    | Functional core                         | Type-safe errors, services, config, retry, scheduling                        |

### Infrastructure Layer

| Technology         | Purpose                        | Why                                                   |
| ------------------ | ------------------------------ | ----------------------------------------------------- |
| **PostgreSQL 16**  | Primary database               | Reliable, full-text search built-in, you know it well |
| **MinIO**          | Object storage (S3-compatible) | Store CV files (DOCX/PDF) locally with S3 API         |
| **Docker Compose** | Container orchestration        | One command to spin up the full stack                 |
| **Nix (flake)**    | Dev environment                | Reproducible tooling (bun, docker CLI)                |

### AI Layer

| Technology                           | Purpose            | Why                                                                     |
| ------------------------------------ | ------------------ | ----------------------------------------------------------------------- |
| **Claude Agent SDK**                 | CV tailoring agent | Full agentic loop, built-in tools, custom MCP tools, session management |
| **`@anthropic-ai/claude-agent-sdk`** | TypeScript SDK     | `query()` + `createSdkMcpServer()` + streaming                          |
| **`zod`**                            | Tool input schemas | Type-safe custom MCP tool definitions                                   |

> **Auth:** Uses `ANTHROPIC_API_KEY` from [console.anthropic.com](https://console.anthropic.com) — the officially supported method.

### Libraries

| Library                          | Purpose                                                                                                  |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `effect`                         | Core Effect TS library — errors, services, config, retry, streams, **Schema**                            |
| `@effect/sql`                    | Database-agnostic SQL abstraction — tagged templates, transactions, resolvers, migrations                |
| `@effect/sql-pg`                 | PostgreSQL driver for @effect/sql — uses postgres.js under the hood, PgClient, PgMigrator                |
| `@effect/platform-bun`           | Bun-specific platform bindings for Effect (filesystem for migrations)                                    |
| `@anthropic-ai/claude-agent-sdk` | Claude Agent SDK — agentic loop, tools, MCP                                                              |
| `@aws-sdk/client-s3`             | MinIO/S3 client for file operations                                                                      |
| `mammoth`                        | DOCX → text extraction                                                                                   |
| `pdf-parse`                      | PDF → text extraction                                                                                    |
| `tailwindcss`                    | Styling                                                                                                  |
| `zod`                            | MCP tool input schemas (required by Agent SDK) — NOT used for DB validation (Effect Schema handles that) |
| `date-fns`                       | Date formatting                                                                                          |

---

## Effect TS Primer — Learn by Building

> **Goal:** Build your understanding of Effect from the ground up, starting with the simplest possible examples. Every example runs with Bun and is heavily commented so you can trace what happens step by step.

### Lesson 0: Setup — Effect + Bun

```bash
# Create a playground folder for learning
mkdir effect-playground && cd effect-playground

# Initialize with Bun (creates package.json + tsconfig.json)
bun init

# Install Effect
bun add effect

# Verify it works
echo 'import { Effect } from "effect"; console.log("Effect loaded!")' > test.ts
bun test.ts
```

```jsonc
// tsconfig.json — Effect requires strict mode
{
  "compilerOptions": {
    "strict": true, // REQUIRED by Effect for type inference
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun-types"], // Bun's built-in types
  },
}
```

---

### Lesson 1: Effect vs Promise — The Mental Model

```typescript
// file: 01-effect-vs-promise.ts
// run:  bun 01-effect-vs-promise.ts
//
// PURPOSE: Understand what an Effect IS and how it differs from a Promise.
//
// KEY INSIGHT: A Promise is "hot" — it runs immediately when created.
//              An Effect is "cold" — it's just a DESCRIPTION of work.
//              Nothing happens until you explicitly run it.

import { Effect } from "effect";

// ─── PROMISE WAY (what you already know) ─────────────────────
//
// The moment this line executes, the function runs.
// The Promise is already "in flight" — you can't stop it.
const promiseGreeting = new Promise<string>((resolve) => {
  console.log(
    "  [Promise] I'm running RIGHT NOW, even before anyone awaits me!",
  );
  resolve("Hello from Promise");
});

// ─── EFFECT WAY (what we're learning) ────────────────────────
//
// This line does NOTHING. It creates a "blueprint" of work.
// Think of it like writing a recipe — no cooking happens yet.
//
// Effect.succeed() creates an Effect that will succeed with the value you give it.
// The type is: Effect<string, never, never>
//   - string  = the SUCCESS type (what you get if it works)
//   - never   = the ERROR type (never = this effect cannot fail)
//   - never   = the REQUIREMENTS type (never = no dependencies needed)
const effectGreeting = Effect.succeed("Hello from Effect");

// Effect.sync() wraps a function that runs synchronously.
// The function is NOT called until you run the Effect.
// Use this when you have a side effect (like console.log) that you
// want to delay until execution time.
const effectWithSideEffect = Effect.sync(() => {
  console.log("  [Effect] I only run when someone RUNS me!");
  return "Hello from Effect.sync";
});

// ─── RUNNING EFFECTS ─────────────────────────────────────────
//
// To actually execute an Effect, you need a "runner".
// Effect.runSync() runs the effect synchronously and returns the value.
// (There's also runPromise() for async effects — we'll see that later.)

console.log("\n--- Creating things ---");
console.log("Promise was created above (already ran!)");
console.log("Effect was created above (nothing happened yet)");

console.log("\n--- Running the Effect NOW ---");
const result = Effect.runSync(effectGreeting);
console.log("  Got:", result);

console.log("\n--- Running Effect with side effect ---");
const result2 = Effect.runSync(effectWithSideEffect);
console.log("  Got:", result2);

console.log("\n--- Running same Effect AGAIN (it re-executes!) ---");
const result3 = Effect.runSync(effectWithSideEffect);
console.log("  Got:", result3);

// OUTPUT:
// --- Creating things ---
//   [Promise] I'm running RIGHT NOW, even before anyone awaits me!
// Promise was created above (already ran!)
// Effect was created above (nothing happened yet)
//
// --- Running the Effect NOW ---
//   Got: Hello from Effect
//
// --- Running Effect with side effect ---
//   [Effect] I only run when someone RUNS me!
//   Got: Hello from Effect.sync
//
// --- Running same Effect AGAIN (it re-executes!) ---
//   [Effect] I only run when someone RUNS me!
//   Got: Hello from Effect.sync

// ─── WHY THIS MATTERS ────────────────────────────────────────
//
// Because Effects are descriptions (not running code), you can:
// 1. Compose them before running (chain operations)
// 2. Add retry logic around them
// 3. Add timeouts
// 4. Run them in parallel
// 5. Test them without side effects
// 6. Swap implementations for testing
//
// None of this is easy with Promises because they start immediately.
```

---

### Lesson 2: Typed Errors — No More try/catch Guessing

```typescript
// file: 02-typed-errors.ts
// run:  bun 02-typed-errors.ts
//
// PURPOSE: See how Effect makes errors VISIBLE in the type system.
//
// KEY INSIGHT: In normal TypeScript, a function signature like
//   function getUser(id: string): Promise<User>
// tells you NOTHING about what can go wrong. You have to read the
// implementation (or docs) to discover it might throw "UserNotFound"
// or "DatabaseTimeout" etc.
//
// With Effect, errors are in the TYPE:
//   function getUser(id: string): Effect<User, UserNotFound | DbError>
// Now the compiler FORCES you to handle those specific errors.

import { Effect, Data } from "effect";

// ─── STEP 1: Define your errors as classes ───────────────────
//
// Data.TaggedError gives you:
// - A `_tag` field for discriminated unions (pattern matching)
// - Structural equality (two errors with same data are equal)
// - A YieldableError so you can `yield*` them in generators
//
// Think of _tag like a label: "this is a NotFoundError" vs "this is a ValidationError"

class NotFoundError extends Data.TaggedError("NotFoundError")<{
  // 'message' is the human-readable description
  readonly message: string;
}> {}

class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string;
  readonly reason: string;
}> {}

// ─── STEP 2: Write functions that return Effects with typed errors ─

// Look at the return type carefully:
//   Effect<{ id: string; name: string }, NotFoundError | ValidationError>
//
// This tells any caller: "I might succeed with a user object,
// OR I might fail with NotFoundError OR ValidationError."
// The compiler knows this and will enforce handling.

const findUser = (
  id: string,
): Effect.Effect<
  { id: string; name: string }, // Success type
  NotFoundError | ValidationError // Error types (union)
> => {
  // Effect.gen is like async/await but for Effects.
  // The function* () is a generator. yield* "unwraps" an Effect.
  // If the yielded Effect fails, the whole generator short-circuits
  // (just like await with a rejected Promise, but type-safe).
  return Effect.gen(function* () {
    // Validate input
    if (id.length === 0) {
      // yield* Effect.fail(...) throws a typed error.
      // The generator stops here — nothing below runs.
      // This error becomes part of the function's Error type.
      return yield* Effect.fail(
        new ValidationError({ field: "id", reason: "ID cannot be empty" }),
      );
    }

    // Simulate lookup
    if (id !== "user-1") {
      return yield* Effect.fail(
        new NotFoundError({ message: `User ${id} not found` }),
      );
    }

    // Happy path — return the user
    return { id, name: "Indra" };
  });
};

// ─── STEP 3: Handle errors with pattern matching ─────────────
//
// Effect.catchTags lets you handle errors by their _tag.
// Each tag gets its own handler.
// The type system KNOWS which errors remain unhandled.

const program = findUser("user-999").pipe(
  // catchTags gives you one handler per error _tag.
  // After this, the error type becomes `never` (all handled).
  Effect.catchTags({
    // Each key matches the _tag of an error class
    NotFoundError: (err) =>
      // We recover by returning a default user
      Effect.succeed({ id: "unknown", name: `[Not found: ${err.message}]` }),

    ValidationError: (err) =>
      Effect.succeed({
        id: "invalid",
        name: `[Invalid ${err.field}: ${err.reason}]`,
      }),
  }),
);

// ─── STEP 4: Run it ──────────────────────────────────────────

// program's type is: Effect<{ id: string; name: string }, never, never>
//                                                         ^^^^^
// Error is `never` — all errors are handled! Safe to runSync.
const user = Effect.runSync(program);
console.log("Result:", user);
// Result: { id: 'unknown', name: '[Not found: User user-999 not found]' }

// ─── TRY OTHER INPUTS ────────────────────────────────────────
console.log("\nValid user:");
console.log(
  Effect.runSync(
    findUser("user-1").pipe(
      Effect.catchTags({
        NotFoundError: (err) => Effect.succeed({ id: "?", name: err.message }),
        ValidationError: (err) => Effect.succeed({ id: "?", name: err.reason }),
      }),
    ),
  ),
);
// Result: { id: 'user-1', name: 'Indra' }

console.log("\nEmpty ID:");
console.log(
  Effect.runSync(
    findUser("").pipe(
      Effect.catchTags({
        NotFoundError: (err) => Effect.succeed({ id: "?", name: err.message }),
        ValidationError: (err) => Effect.succeed({ id: "?", name: err.reason }),
      }),
    ),
  ),
);
// Result: { id: '?', name: 'ID cannot be empty' }

// ─── WHAT HAPPENS IF YOU FORGET TO HANDLE AN ERROR? ──────────
//
// Uncomment this to see:
//   const incomplete = findUser("x").pipe(
//     Effect.catchTags({
//       NotFoundError: (err) => Effect.succeed({ id: "?", name: err.message }),
//       // ← ValidationError not handled!
//     })
//   )
//   Effect.runSync(incomplete)  // TypeScript ERROR:
//   // Type 'Effect<..., ValidationError, ...>' is not assignable to
//   // 'Effect<..., never, ...>'
//   //
//   // The compiler tells you: "Hey, ValidationError can still happen!"
```

---

### Lesson 3: Pipe — Composing Operations

```typescript
// file: 03-pipe.ts
// run:  bun 03-pipe.ts
//
// PURPOSE: Learn to chain Effect operations with pipe().
//
// KEY INSIGHT: pipe() passes a value through a series of functions
// left-to-right. It's like the Unix pipe: `cat file | grep error | wc -l`
//
// In Effect, every operation (map, flatMap, tap, catchAll, retry, timeout)
// is a function you pass through pipe.

import { Effect, pipe } from "effect";

// ─── BASIC PIPE: Transform values ────────────────────────────

// pipe(startValue, fn1, fn2, fn3) is the same as fn3(fn2(fn1(startValue)))
// but reads left-to-right instead of inside-out.

const result = pipe(
  10, // Start with 10
  (n) => n * 2, // → 20
  (n) => n + 5, // → 25
  (n) => `Result: ${n}`, // → "Result: 25"
);
console.log(result); // "Result: 25"

// ─── EFFECT PIPE: Chain Effect operations ────────────────────

// Most of the time you'll use .pipe() method on an Effect directly.
// This is the same as pipe(effect, fn1, fn2) but reads better.

const fetchScore = Effect.succeed(85);

const program = fetchScore.pipe(
  // Effect.map: transform the SUCCESS value (like .then())
  // Does NOT change the error type.
  Effect.map((score) => score * 1.1),

  // Effect.map again: round it
  Effect.map((boosted) => Math.round(boosted)),

  // Effect.tap: do something with the value but DON'T change it.
  // Useful for logging, analytics, side effects.
  // The value passes through unchanged.
  Effect.tap((score) =>
    Effect.sync(() => console.log(`  [tap] Score is ${score}`)),
  ),

  // Effect.flatMap (also called andThen): the value goes into a function
  // that returns a NEW Effect. The result replaces the current value.
  // Use this when your transform can fail or is async.
  Effect.flatMap((score) =>
    score >= 90
      ? Effect.succeed(`Grade: A (${score})`)
      : Effect.succeed(`Grade: B (${score})`),
  ),
);

console.log("Running pipeline:");
console.log(Effect.runSync(program));

// OUTPUT:
// Running pipeline:
//   [tap] Score is 94
// Grade: A (94)

// ─── WHY PIPE? ───────────────────────────────────────────────
//
// Without pipe, the same code looks like this (harder to read):
//
//   Effect.flatMap(
//     Effect.tap(
//       Effect.map(
//         Effect.map(fetchScore, (score) => score * 1.1),
//         (boosted) => Math.round(boosted)
//       ),
//       (score) => Effect.sync(() => console.log(`Score: ${score}`))
//     ),
//     (score) => score >= 90
//       ? Effect.succeed(`Grade: A (${score})`)
//       : Effect.succeed(`Grade: B (${score})`)
//   )
//
// Nested, inside-out, confusing. Pipe makes it linear and readable.
```

---

### Lesson 4: Effect.gen — The Generator Pattern (async/await for Effect)

```typescript
// file: 04-gen.ts
// run:  bun 04-gen.ts
//
// PURPOSE: Use Effect.gen for sequential code that reads like async/await.
//
// KEY INSIGHT: Effect.gen(function* () { ... }) is your daily driver.
// Inside the generator, yield* unwraps an Effect (like await unwraps a Promise).
// If the yielded Effect fails, the entire generator stops — just like
// an un-caught await rejection.
//
// Use pipe() for simple transforms. Use gen() for complex logic with
// if/else, loops, and multiple steps.

import { Effect, Data } from "effect";

class InsufficientFunds extends Data.TaggedError("InsufficientFunds")<{
  readonly balance: number;
  readonly requested: number;
}> {}

class AccountFrozen extends Data.TaggedError("AccountFrozen")<{
  readonly reason: string;
}> {}

// ─── A realistic example: bank withdrawal ────────────────────

const withdraw = (
  accountId: string,
  amount: number,
): Effect.Effect<
  { newBalance: number; transactionId: string }, // Success
  InsufficientFunds | AccountFrozen // Errors
> =>
  Effect.gen(function* () {
    // STEP 1: Fetch account (simulated)
    // yield* unwraps the Effect. If it fails, we stop here.
    const account = yield* Effect.succeed({
      id: accountId,
      balance: 500,
      frozen: accountId === "frozen-account",
    });

    // STEP 2: Check if frozen
    // You can use normal if/else inside gen()!
    if (account.frozen) {
      // yield* Effect.fail stops the generator with a typed error
      return yield* Effect.fail(
        new AccountFrozen({ reason: "Account is under review" }),
      );
    }

    // STEP 3: Check balance
    if (account.balance < amount) {
      return yield* Effect.fail(
        new InsufficientFunds({
          balance: account.balance,
          requested: amount,
        }),
      );
    }

    // STEP 4: Process withdrawal (simulated)
    const newBalance = account.balance - amount;

    // STEP 5: Log it (tap-style, using yield* for side effects)
    yield* Effect.log(
      `Withdrew ${amount} from ${accountId}. New balance: ${newBalance}`,
    );

    // STEP 6: Return success
    return {
      newBalance,
      transactionId: `txn_${Date.now()}`,
    };
  });

// ─── Run different scenarios ─────────────────────────────────

const scenarios = [
  { id: "acc-1", amount: 200, label: "Normal withdrawal" },
  { id: "acc-1", amount: 9999, label: "Overdraft attempt" },
  { id: "frozen-account", amount: 50, label: "Frozen account" },
];

for (const { id, amount, label } of scenarios) {
  console.log(`\n--- ${label} ---`);
  const result = Effect.runSync(
    withdraw(id, amount).pipe(
      Effect.catchTags({
        InsufficientFunds: (e) =>
          Effect.succeed({
            newBalance: e.balance,
            transactionId: `DENIED: need ${e.requested}, have ${e.balance}`,
          }),
        AccountFrozen: (e) =>
          Effect.succeed({
            newBalance: -1,
            transactionId: `DENIED: ${e.reason}`,
          }),
      }),
    ),
  );
  console.log("  Result:", result);
}
```

---

### Lesson 5: Services & Layers — Dependency Injection

```typescript
// file: 05-services.ts
// run:  bun 05-services.ts
//
// PURPOSE: Understand Effect's dependency injection system.
//
// KEY INSIGHT: Services are interfaces. Layers are implementations.
// Your business logic says "I need a Database" without knowing HOW
// the database works. At app startup, you PROVIDE the real implementation.
// In tests, you PROVIDE a fake/mock implementation.
//
// This is the third generic parameter of Effect:
//   Effect<Success, Error, Requirements>
//                          ^^^^^^^^^^^^
// "Requirements" lists which services this Effect needs to run.

import { Effect, Context, Layer } from "effect";

// ─── STEP 1: Define a Service interface ──────────────────────
//
// A Service is defined with Context.Tag. This creates a "tag"
// (like a unique key) that the runtime uses to look up implementations.
//
// Think of it as: "I need something that implements this interface."

class UserRepo extends Context.Tag("UserRepo")<
  UserRepo,
  {
    // The interface methods. These define WHAT, not HOW.
    readonly findById: (
      id: string,
    ) => Effect.Effect<{ id: string; name: string } | null>;
    readonly save: (user: { id: string; name: string }) => Effect.Effect<void>;
  }
>() {}

// ─── STEP 2: Use the service in your business logic ──────────
//
// Your code yields the service Tag to get its implementation.
// Notice: the function DOES NOT import or create a database.
// It just says "give me a UserRepo, and I'll use it."

const getUser = (id: string) =>
  Effect.gen(function* () {
    // yield* UserRepo gives you the implementation at runtime.
    // The type system tracks this: "this Effect needs UserRepo"
    const repo = yield* UserRepo;

    const user = yield* repo.findById(id);

    if (!user) {
      return yield* Effect.fail(new Error(`User ${id} not found`));
    }

    return user;
  });

// Check the type of getUser:
//   (id: string) => Effect<{ id: string; name: string }, Error, UserRepo>
//                                                                ^^^^^^^^
// "UserRepo" appears in Requirements! The compiler knows we need it.

// ─── STEP 3: Create Layer implementations ────────────────────
//
// A Layer satisfies a service requirement. It's the "how."
// You can have multiple Layers for the same service:
// - InMemoryUserRepo for tests
// - PostgresUserRepo for production

// In-memory implementation (for testing/learning)
const InMemoryUserRepo = Layer.succeed(UserRepo, {
  findById: (id) =>
    Effect.succeed(id === "user-1" ? { id: "user-1", name: "Indra" } : null),
  save: (_user) => Effect.succeed(undefined), // no-op for now
});

// ─── STEP 4: Provide the layer and run ───────────────────────
//
// Effect.provide "injects" the Layer into the Effect.
// After providing, the Requirements type changes from UserRepo to never.

const program = getUser("user-1").pipe(
  // After this line: Effect<..., Error, UserRepo>
  Effect.provide(InMemoryUserRepo),
  // After this line: Effect<..., Error, never>
  //                                      ^^^^^
  // Requirements satisfied! Now it's runnable.
  Effect.catchAll((err) =>
    Effect.succeed({ id: "fallback", name: err.message }),
  ),
);

console.log(Effect.runSync(program));
// { id: 'user-1', name: 'Indra' }

// ─── WHY SERVICES + LAYERS? ─────────────────────────────────
//
// In JobForge, you'll define:
//   - MinioService  → Layer.succeed(MinioService, { ... real S3 client })
//   - DatabaseService → Layer using @effect/sql-pg (SqlClient)
//
// In tests:
//   - MinioService  → Layer.succeed(MinioService, { ... in-memory store })
//   - DatabaseService → Layer using SQLite
//
// Your business logic (getUser, uploadCV, tailorCV) stays IDENTICAL.
// Only the Layer changes between production and testing.
```

---

### Lesson 6: Effect.tryPromise — Wrapping Existing Libraries

```typescript
// file: 06-try-promise.ts
// run:  bun 06-try-promise.ts
//
// PURPOSE: Wrap Promise-based code (like fetch, database calls, SDK calls)
// into Effect so you get typed errors.
//
// KEY INSIGHT: You don't rewrite your libraries. You wrap them at the edge.
// Drizzle, @aws-sdk/client-s3, mammoth — they all return Promises.
// Effect.tryPromise converts them into Effects with typed errors.
//
// NOTE: For database calls, @effect/sql-pg is even better — it returns
// Effects natively, so you don't need tryPromise for SQL queries.
// tryPromise is still needed for MinIO S3 and mammoth.

import { Effect, Data } from "effect";

// ─── Define typed errors for the API call ────────────────────

class FetchError extends Data.TaggedError("FetchError")<{
  readonly url: string;
  readonly cause: unknown;
}> {}

class ParseError extends Data.TaggedError("ParseError")<{
  readonly body: string;
  readonly cause: unknown;
}> {}

// ─── Wrap a fetch call ───────────────────────────────────────

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

const fetchTodo = (id: number): Effect.Effect<Todo, FetchError | ParseError> =>
  Effect.gen(function* () {
    const url = `https://jsonplaceholder.typicode.com/todos/${id}`;

    // Effect.tryPromise wraps a Promise-returning function.
    // If the Promise rejects, the `catch` function maps it to your typed error.
    const response = yield* Effect.tryPromise({
      try: () => fetch(url),
      catch: (error) => new FetchError({ url, cause: error }),
      // Now: FetchError instead of unknown/any thrown error
    });

    // Check HTTP status (fetch doesn't reject on 404!)
    if (!response.ok) {
      return yield* Effect.fail(
        new FetchError({ url, cause: `HTTP ${response.status}` }),
      );
    }

    // Parse JSON with typed error
    const body = yield* Effect.tryPromise({
      try: () => response.text(),
      catch: (error) => new ParseError({ body: "", cause: error }),
    });

    const todo = yield* Effect.tryPromise({
      try: () => JSON.parse(body) as Promise<Todo>,
      catch: (error) => new ParseError({ body, cause: error }),
    });

    return todo;
  });

// ─── Use it with retry ──────────────────────────────────────
//
// Because fetchTodo is an Effect (not a Promise), we can add
// retry logic AROUND it without modifying the function itself.

import { Schedule } from "effect";

const fetchWithRetry = fetchTodo(1).pipe(
  // Retry up to 3 times with exponential backoff
  // Only retries on FetchError (not ParseError — no point retrying a parse failure)
  Effect.retry({
    schedule: Schedule.exponential("500 millis").pipe(
      Schedule.compose(Schedule.recurs(3)),
    ),
    while: (error) => error._tag === "FetchError",
  }),
  Effect.catchAll((error) =>
    Effect.succeed({
      id: -1,
      title: `Failed: ${error._tag}`,
      completed: false,
    }),
  ),
);

// Run it (async because of fetch)
Effect.runPromise(fetchWithRetry).then(console.log);

// ─── PATTERN: Wrapping any Promise library ───────────────────
//
// This is the exact pattern you'll use for:
//
// @effect/sql-pg (native — no tryPromise needed!):
//   const sql = yield* SqlClient.SqlClient
//   const results = yield* sql`SELECT * FROM applications WHERE id = ${id}`
//   // Returns Effect<ReadonlyArray<Row>, SqlError> — already typed!
//
// For comparison, wrapping a non-Effect library with tryPromise:
//
// MinIO (S3):
//   yield* Effect.tryPromise({
//     try: () => s3.send(new GetObjectCommand({ Bucket: "cv-files", Key: key })),
//     catch: (e) => new StorageError({ key, cause: e }),
//   })
//
// mammoth (DOCX parsing):
//   yield* Effect.tryPromise({
//     try: () => mammoth.extractRawText({ buffer }),
//     catch: (e) => new ExtractionError({ fileName, cause: e }),
//   })
```

---

### Lesson 7: Config — Type-Safe Environment Variables

```typescript
// file: 07-config.ts
// run:  DATABASE_URL="postgresql://localhost/test" MINIO_PORT=9000 bun 07-config.ts
//
// PURPOSE: Replace manual process.env parsing with Effect's Config.
//
// KEY INSIGHT: Config is an Effect that reads from the environment.
// It validates types, handles defaults, marks secrets, and gives
// clear error messages when a required variable is missing.

import { Effect, Config } from "effect";

// ─── Define your app config ──────────────────────────────────

// Each Config.xxx creates a small Effect that reads one env var.
// Config.string("DATABASE_URL") reads process.env.DATABASE_URL
// and fails with a ConfigError if it's missing.

const appConfig = Effect.all({
  // Required string — will fail if missing
  databaseUrl: Config.string("DATABASE_URL"),

  // Number with a default value — reads MINIO_PORT, defaults to 9000
  minioPort: Config.withDefault(Config.number("MINIO_PORT"), 9000),

  // Secret — the value is wrapped so it won't be accidentally logged.
  // Config.secret reads the env var and wraps it in Secret.Secret.
  // To get the raw value, use Secret.value(secret).
  anthropicKey: Config.withDefault(
    Config.secret("ANTHROPIC_API_KEY"),
    // For development, provide a dummy default:
    // (in production, this would be required — no default)
    Config.secret("ANTHROPIC_API_KEY"), // will fail if missing
  ),

  // Boolean — reads "true"/"false" string, converts to boolean
  minioUseSsl: Config.withDefault(Config.boolean("MINIO_USE_SSL"), false),
});

// ─── Use it in your app ──────────────────────────────────────

const program = Effect.gen(function* () {
  // This reads ALL config at once. If any required var is missing,
  // you get a clear error like:
  //   "ConfigError: Expected DATABASE_URL to exist in the process context"
  const config = yield* appConfig;

  console.log("Database URL:", config.databaseUrl);
  console.log("MinIO Port:", config.minioPort);
  console.log("MinIO SSL:", config.minioUseSsl);
  // Note: config.anthropicKey is a Secret — won't print the value
  // console.log("API Key:", config.anthropicKey) → "Secret(<redacted>)"

  return config;
});

// ─── Run with error handling ─────────────────────────────────

Effect.runPromise(
  program.pipe(
    Effect.catchAll((error) => {
      console.error("Config error:", error);
      return Effect.succeed(null);
    }),
  ),
).then((config) => {
  if (config) {
    console.log("\nConfig loaded successfully!");
  }
});
```

---

### Lesson Summary: What You Now Know

```
Concept         │ What it does                    │ JobForge usage
────────────────┼─────────────────────────────────┼──────────────────────
Effect.succeed  │ Create an effect from a value   │ Return computed results
Effect.fail     │ Create a typed error            │ NotFound, Validation errors
Effect.gen      │ async/await style code          │ All server functions
pipe()          │ Chain operations left-to-right  │ Transform data pipelines
Effect.map      │ Transform success value         │ Format API responses
Effect.tap      │ Side effect without changing    │ Logging, analytics
Effect.flatMap  │ Chain dependent effects         │ Sequential DB operations
Effect.catchTags│ Handle errors by _tag           │ Route-level error handling
Data.TaggedError│ Define typed error classes      │ All domain errors
Effect.tryPromise│ Wrap Promises                  │ MinIO, mammoth (NOT needed for DB — @effect/sql is native)
Context.Tag     │ Define a service interface      │ UserRepo, MinioService
Layer.succeed   │ Create a service implementation │ InMemory, Postgres layers
Effect.provide  │ Inject dependencies             │ Wire up at app entry
Config          │ Type-safe env variables         │ DATABASE_URL, API keys
Schedule        │ Retry/repeat policies           │ API retries, polling
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│  TanStack Start (SSR) + TanStack Router/Query    │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              TanStack Start Server (Bun)                  │
│         (Server Functions / API Routes)                   │
│                                                           │
│  ┌──────────────────────────────────────────────────┐    │
│  │            Effect Service Layer                    │    │
│  │                                                    │    │
│  │  ApplicationService ─── Effect<App, AppError>      │    │
│  │  QAService ──────────── Effect<QA, QAError>        │    │
│  │  CVService ──────────── Effect<CV, CVError>        │    │
│  │  AIService ──────────── Effect<Session, AIError>   │    │
│  │                                                    │    │
│  │  Each service depends on:                          │    │
│  │  ├── DatabaseService (@effect/sql-pg + PostgreSQL)  │    │
│  │  ├── StorageService (MinIO S3)                     │    │
│  │  └── ConfigService (Effect Config)                 │    │
│  └────────┬──────────────────┬────────────────────────┘    │
│           │                  │                              │
│  ┌────────┴────────┐  ┌─────┴──────┐                      │
│  │  PostgreSQL 16   │  │   MinIO     │                      │
│  │                  │  │             │                      │
│  │  - applications  │  │  Buckets:   │                      │
│  │  - qa_entries    │  │  - cv-files │                      │
│  │  - cv_base       │  │             │                      │
│  │  - cv_variants   │  └──────┬──────┘                      │
│  │  - ai_sessions   │         │                              │
│  └──────────────────┘         │                              │
│                               │                              │
│  ┌────────────────────────────┴─────────────────────────┐   │
│  │           Claude Agent SDK                            │   │
│  │  Custom MCP Tools (wrapped in Effect.tryPromise):     │   │
│  │  ├── get_base_cv    → StorageService                  │   │
│  │  ├── get_job_desc   → DatabaseService                 │   │
│  │  ├── save_variant   → StorageService + DatabaseService│   │
│  │  └── search_qa      → DatabaseService (FTS)           │   │
│  └───────────────────────────┬───────────────────────────┘   │
│                              │ HTTPS                         │
└──────────────────────────────┼───────────────────────────────┘
                               ▼
                     ┌──────────────────┐
                     │  Anthropic API    │
                     │  api.anthropic.com│
                     └──────────────────┘
```

---

## Data Model

Same schema as v1 — PostgreSQL tables. No ORM — using `@effect/sql-pg` with raw SQL tagged templates and Effect Schema for runtime validation. The schema doesn't change with Bun or Effect — those are runtime/code concerns, not data concerns.

### Entity Relationship

```
applications ─────────┐
  │                    │ (many-to-many)
  │ (one-to-many)      │
  ▼                    ▼
qa_entries    application_cv_variants
                       │
                       ▼
              cv_variants
                  │
                  │ (many-to-one)
                  ▼
              cv_base

applications ──── (one-to-many) ──── ai_sessions
cv_variants  ──── (one-to-one)  ──── ai_sessions
```

### Schema Detail (PostgreSQL + Effect Schema)

#### `applications`

| Column             | Type                      | Description                                                                    |
| ------------------ | ------------------------- | ------------------------------------------------------------------------------ |
| `id`               | `uuid` (PK)               | Auto-generated                                                                 |
| `company`          | `varchar(255)`            | Company name                                                                   |
| `role`             | `varchar(255)`            | Job title/role applied for                                                     |
| `url`              | `text` (nullable)         | Job posting URL                                                                |
| `status`           | `enum`                    | `draft`, `applied`, `screening`, `interview`, `offer`, `rejected`, `withdrawn` |
| `job_description`  | `text` (nullable)         | Full JD snapshot (copy-paste or extracted)                                     |
| `salary_range`     | `varchar(100)` (nullable) | Expected/posted salary range                                                   |
| `location`         | `varchar(255)` (nullable) | Office location / remote status                                                |
| `platform`         | `varchar(100)` (nullable) | Where you found it (LinkedIn, company site, referral)                          |
| `contact_name`     | `varchar(255)` (nullable) | Recruiter/hiring manager name                                                  |
| `contact_email`    | `varchar(255)` (nullable) | Contact email                                                                  |
| `notes`            | `text` (nullable)         | Free-form notes                                                                |
| `applied_at`       | `timestamp` (nullable)    | When application was submitted                                                 |
| `next_action`      | `text` (nullable)         | What's the next step / follow-up needed                                        |
| `next_action_date` | `timestamp` (nullable)    | When to follow up                                                              |
| `created_at`       | `timestamp`               | Auto                                                                           |
| `updated_at`       | `timestamp`               | Auto                                                                           |

#### `qa_entries`

| Column           | Type                  | Description                                                          |
| ---------------- | --------------------- | -------------------------------------------------------------------- |
| `id`             | `uuid` (PK)           | Auto-generated                                                       |
| `application_id` | `uuid` (FK, nullable) | Linked application (null = general/reusable)                         |
| `question`       | `text`                | The question asked                                                   |
| `answer`         | `text`                | Your answer                                                          |
| `tags`           | `text[]`              | Tags for categorization (e.g., `leadership`, `technical`, `culture`) |
| `search_vector`  | `tsvector`            | PostgreSQL full-text search index                                    |
| `created_at`     | `timestamp`           | Auto                                                                 |
| `updated_at`     | `timestamp`           | Auto                                                                 |

**Full-text search:** A PostgreSQL trigger will auto-update `search_vector` from `question || ' ' || answer` using `to_tsvector('english', ...)`. This gives you instant search across all Q&A entries.

#### `cv_base`

| Column           | Type              | Description                                        |
| ---------------- | ----------------- | -------------------------------------------------- |
| `id`             | `uuid` (PK)       | Auto-generated                                     |
| `version`        | `integer`         | Version number (1, 2, 3...)                        |
| `file_key`       | `varchar(500)`    | MinIO object key (e.g., `cv-files/base/v3.docx`)   |
| `file_name`      | `varchar(255)`    | Original filename                                  |
| `file_type`      | `enum`            | `docx`, `pdf`                                      |
| `extracted_text` | `text` (nullable) | Plain text extracted from file (for AI processing) |
| `notes`          | `text` (nullable) | What changed in this version                       |
| `is_active`      | `boolean`         | Which version is the current default               |
| `created_at`     | `timestamp`       | Auto                                               |

#### `cv_variants`

| Column                 | Type              | Description                                            |
| ---------------------- | ----------------- | ------------------------------------------------------ |
| `id`                   | `uuid` (PK)       | Auto-generated                                         |
| `base_cv_id`           | `uuid` (FK)       | Which base CV this was derived from                    |
| `name`                 | `varchar(255)`    | Descriptive name (e.g., "Backend-focused for fintech") |
| `file_key`             | `varchar(500)`    | MinIO object key                                       |
| `file_name`            | `varchar(255)`    | Original filename                                      |
| `file_type`            | `enum`            | `docx`, `pdf`                                          |
| `extracted_text`       | `text` (nullable) | Plain text for searchability                           |
| `tailoring_notes`      | `text` (nullable) | What was changed / AI suggestions applied              |
| `job_description_used` | `text` (nullable) | The JD that informed this variant                      |
| `source`               | `enum`            | `manual`, `ai_generated`                               |
| `created_at`           | `timestamp`       | Auto                                                   |

#### `application_cv_variants` (junction table)

| Column           | Type        | Description                           |
| ---------------- | ----------- | ------------------------------------- |
| `application_id` | `uuid` (FK) | Application this variant was used for |
| `cv_variant_id`  | `uuid` (FK) | The CV variant used                   |
| `created_at`     | `timestamp` | When it was linked                    |

**Composite PK:** `(application_id, cv_variant_id)`

This junction table enables: "Show me which CV I sent to Company X" and "Show me all applications where I used this backend-focused CV variant."

#### `ai_sessions`

Tracks every AI tailoring interaction — what was sent to Claude, what came back, and whether it was accepted.

| Column                  | Type                  | Description                                              |
| ----------------------- | --------------------- | -------------------------------------------------------- |
| `id`                    | `uuid` (PK)           | Auto-generated                                           |
| `application_id`        | `uuid` (FK, nullable) | Which application triggered this session                 |
| `base_cv_id`            | `uuid` (FK)           | Which base CV was used as input                          |
| `cv_variant_id`         | `uuid` (FK, nullable) | The resulting variant (null if not yet accepted)         |
| `job_description_input` | `text`                | The JD that was analyzed                                 |
| `prompt_used`           | `text`                | The full prompt sent to Claude (for debugging/iteration) |
| `ai_response`           | `text`                | Claude's raw response (analysis + suggestions)           |
| `model_used`            | `varchar(100)`        | e.g., `claude-sonnet-4-5-20250929`                       |
| `input_tokens`          | `integer` (nullable)  | Token usage tracking                                     |
| `output_tokens`         | `integer` (nullable)  | Token usage tracking                                     |
| `status`                | `enum`                | `pending`, `completed`, `accepted`, `rejected`           |
| `created_at`            | `timestamp`           | Auto                                                     |

This gives you a full audit trail: "What did Claude suggest for the TechCo application? What prompt worked best? How many tokens am I using?"

---

## Where Effect TS Lives in JobForge

> Not everything needs Effect. Use it where it adds value — error handling, service boundaries, retries, config. Keep UI components and simple utils as plain TypeScript.

### Effect Boundary Map

```
┌─────────────────────────────────────────────────────────────┐
│  BROWSER (React/TanStack)                                    │
│                                                              │
│  Components, hooks, TanStack Query                           │
│  → Plain TypeScript. No Effect here.                         │
│  → TanStack Query handles loading/error states               │
│                                                              │
├──── BOUNDARY: Server Functions ──────────────────────────────┤
│                                                              │
│  SERVER (TanStack Start server functions)                     │
│                                                              │
│  Route handlers → thin layer that:                           │
│  1. Receives request                                         │
│  2. Calls Effect program                                     │
│  3. Runs with Effect.runPromise()                            │
│  4. Returns JSON or throws HTTP error                        │
│                                                              │
├──── EFFECT LAYER: Services ──────────────────────────────────┤
│                                                              │
│  DatabaseService  → uses @effect/sql-pg SqlClient (native Effect)│
│  StorageService   → wraps MinIO S3 calls in Effect.tryPromise│
│  CVService        → business logic using gen() + pipe()      │
│  QAService        → business logic using gen() + pipe()      │
│  AIService        → wraps Agent SDK, streams with Effect     │
│                                                              │
│  Config           → reads DATABASE_URL, MINIO_*, API keys    │
│                                                              │
├──── EFFECT LAYER: Error Types ───────────────────────────────┤
│                                                              │
│  NotFoundError, ValidationError, DatabaseError,              │
│  StorageError, ExtractionError, AIError, ConfigError         │
│  → All extend Data.TaggedError                               │
│  → Visible in function return types                          │
│  → Pattern-matched with catchTags                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Concrete Examples: Where Effect Replaces try/catch

**Before (v1 — plain TypeScript):**

```typescript
// v1: No idea what errors can happen
async function getApplication(id: string) {
  try {
    const app = await db
      .select()
      .from(applications)
      .where(eq(applications.id, id));
    if (!app.length) throw new Error("Not found");
    return app[0];
  } catch (e) {
    // What is `e`? Could be anything. DB timeout? Not found? Invalid UUID?
    throw e; // ¯\_(ツ)_/¯
  }
}
```

**After (v2 — Effect + @effect/sql-pg):**

```typescript
// v2: Every possible error is in the type signature
const getApplication = (
  id: string,
): Effect.Effect<
  Application, // Success
  NotFoundError | SqlError, // Errors (explicit!)
  SqlClient.SqlClient // Requirements (provided by PgClient layer)
> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    // @effect/sql tagged template — returns Effect natively, no tryPromise needed
    const results = yield* sql<Application>`
      SELECT * FROM applications WHERE id = ${id}
    `;

    if (results.length === 0) {
      return yield* Effect.fail(
        new NotFoundError({ entity: "Application", id }),
      );
    }

    return results[0];
  });
```

### What NOT to Effect-ify

| Keep as plain TS              | Why                                                   |
| ----------------------------- | ----------------------------------------------------- |
| React components              | Effect is for server-side logic                       |
| TanStack Query hooks          | Already handles loading/error/cache                   |
| CSS/Tailwind                  | Obviously                                             |
| Date formatting               | Simple utils, no errors to track                      |
| Migration SQL files           | Pure SQL in `.ts` migration files, not business logic |
| Type definitions / interfaces | Just types                                            |

---

## Module Breakdown

### Module 1: Application Tracker

#### Features

- **Dashboard view:** Summary cards showing count by status
- **List view:** Filterable/sortable table of all applications
- **Detail view:** Full application info + linked Q&A entries + linked CV variants
- **Status pipeline:** Click to advance status
- **Quick add:** Minimal form — company, role, URL, paste JD
- **Follow-up reminders:** Next action + date displayed on dashboard

#### Server Functions (Effect-powered)

```typescript
// Each function returns an Effect with typed errors and service requirements.
// The server function handler runs them with Effect.runPromise().

getApplications(filters?, sort?, page?)
  → Effect<PaginatedList<Application>, DatabaseError, DatabaseService>

getApplication(id)
  → Effect<Application, NotFoundError | DatabaseError, DatabaseService>

createApplication(data)
  → Effect<Application, ValidationError | DatabaseError, DatabaseService>

updateApplication(id, data)
  → Effect<Application, NotFoundError | ValidationError | DatabaseError, DatabaseService>

deleteApplication(id)
  → Effect<void, NotFoundError | DatabaseError, DatabaseService>

getApplicationStats()
  → Effect<StatusCounts, DatabaseError, DatabaseService>
```

#### Routes

```
/                          → Dashboard (stats + recent activity)
/applications              → List view with filters
/applications/new          → Quick add form
/applications/$id          → Detail view
/applications/$id/edit     → Edit form
```

---

### Module 2: Q&A Vault

#### Features

- Per-application Q&A + general/reusable entries
- PostgreSQL full-text search (tsvector)
- Tag system with filtering
- Copy-to-clipboard
- Interview prep view

#### Server Functions

```typescript
getQAEntries(filters?, search?, page?)
  → Effect<PaginatedList<QAEntry>, DatabaseError, DatabaseService>

searchQA(query)
  → Effect<QAEntry[], DatabaseError, DatabaseService>

createQAEntry(data)
  → Effect<QAEntry, ValidationError | DatabaseError, DatabaseService>
```

#### Routes

```
/qa                        → Full Q&A vault with search
/qa/new                    → New entry
/qa/$id/edit               → Edit entry
```

---

### Module 3: CV Version Manager

#### Features

- Base CV management with version tracking
- Variant list with metadata
- Link variants to applications
- File upload/download via MinIO
- Text extraction (mammoth/pdf-parse) wrapped in Effect.tryPromise

#### Server Functions

```typescript
uploadBaseCV(file, notes)
  → Effect<BaseCV, ValidationError | StorageError | ExtractionError, DatabaseService | StorageService>

getVariants(filters?)
  → Effect<CVVariant[], DatabaseError, DatabaseService>

linkVariantToApplication(variantId, appId)
  → Effect<void, NotFoundError | DatabaseError, DatabaseService>
```

#### MinIO Bucket Structure

```
cv-files/
├── base/
│   ├── v1_2024-01-15.docx
│   └── v2_2024-03-20.pdf
└── variants/
    ├── backend-fintech-2024-03-22.docx
    └── infra-lead-2024-05-15.pdf
```

---

### Module 4: AI CV Tailor (Claude Agent SDK)

Same architecture as v1 — Agent SDK with custom MCP tools. The MCP tool implementations now use Effect internally for error handling, but the Agent SDK interface stays the same (it expects Promises, so we use `Effect.runPromise()` at the tool boundary).

_(See v1 for full Agent SDK details, system prompt, and multi-turn session architecture)_

---

## Infrastructure

### Docker Compose

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: jobforge
      POSTGRES_USER: jobforge
      POSTGRES_PASSWORD: jobforge
    volumes:
      - pgdata:/var/lib/postgresql/data

  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: jobforge
      MINIO_ROOT_PASSWORD: jobforge-secret
    volumes:
      - miniodata:/data
    command: server /data --console-address ":9001"

  minio-init:
    image: minio/mc
    depends_on:
      - minio
    entrypoint: >
      /bin/sh -c "
      sleep 3;
      mc alias set local http://minio:9000 jobforge jobforge-secret;
      mc mb local/cv-files --ignore-existing;
      exit 0;
      "

volumes:
  pgdata:
  miniodata:
```

### Nix Flake (Bun instead of Node + pnpm)

```nix
# flake.nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs = { nixpkgs, ... }:
    let
      systems = [ "aarch64-darwin" "x86_64-linux" ];
      forAllSystems = fn: nixpkgs.lib.genAttrs systems (system:
        fn { pkgs = import nixpkgs { inherit system; }; }
      );
    in {
      devShells = forAllSystems ({ pkgs }: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            bun          # Runtime + package manager + test runner (replaces node + pnpm + vitest)
            docker
            docker-compose
          ];

          shellHook = ''
            echo "🔧 JobForge dev environment ready (Bun $(bun --version))"
            echo "Run: docker compose up -d && bun dev"
          '';
        };
      });
    };
}
```

### Environment Variables

```env
# .env
DATABASE_URL=postgresql://jobforge:jobforge@localhost:5432/jobforge

MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=jobforge
MINIO_SECRET_KEY=jobforge-secret
MINIO_BUCKET=cv-files
MINIO_USE_SSL=false

ANTHROPIC_API_KEY=sk-ant-api03-...
```

---

## UI/UX Wireframes

### Dashboard (`/`)

```
┌──────────────────────────────────────────────────────┐
│  JobForge                                    [+ New] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│  │Applied │ │Screen  │ │Interview│ │ Offer  │        │
│  │   12   │ │   4    │ │   3    │ │   1    │        │
│  └────────┘ └────────┘ └────────┘ └────────┘        │
│                                                      │
│  ── Upcoming Follow-ups ─────────────────────        │
│  │ Mar 3  │ Follow up with Acme Corp recruiter  │   │
│  │ Mar 5  │ Send portfolio to StartupXYZ        │   │
│                                                      │
│  ── Recent Applications ─────────────────────        │
│  │ Feb 27 │ Backend Lead @ TechCo    │ Applied  │   │
│  │ Feb 25 │ Sr. Engineer @ FinApp    │ Interview│   │
│  │ Feb 24 │ Platform Eng @ CloudInc  │ Screening│   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Application List (`/applications`)

```
┌──────────────────────────────────────────────────────┐
│  Applications                               [+ New]  │
├──────────────────────────────────────────────────────┤
│  Filter: [All ▾] [Status ▾] [Date range]  🔍 Search │
├──────────────────────────────────────────────────────┤
│  Company       │ Role            │ Status    │ Date   │
│  ─────────────────────────────────────────────────── │
│  TechCo        │ Backend Lead    │ 🟡 Applied │ Feb 27│
│  FinApp        │ Sr. Engineer    │ 🟢 Interview│ Feb 25│
│  CloudInc      │ Platform Eng    │ 🔵 Screening│ Feb 24│
│  StartupXYZ    │ Fullstack Dev   │ 🟡 Applied │ Feb 22│
│  BigBank       │ Infra Engineer  │ 🔴 Rejected│ Feb 20│
└──────────────────────────────────────────────────────┘
```

### Application Detail (`/applications/$id`)

```
┌──────────────────────────────────────────────────────┐
│  ← Back    TechCo — Backend Lead            [Edit]   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Status: [Applied] → [Screening] → [Interview] → ...│
│                ▲ current                             │
│                                                      │
│  Applied: Feb 27, 2025                               │
│  Platform: LinkedIn                                  │
│  Location: Remote (US)                               │
│  Salary: $150k-180k                                  │
│  Contact: Jane Smith (jane@techco.com)               │
│  Next: Follow up Mar 3                               │
│                                                      │
│  ── Job Description ─────────────────────────        │
│  │ We're looking for a backend lead to...       │    │
│  │ [Show full JD]                               │    │
│                                                      │
│  ── Q&A Entries (2) ────────────────── [+ Add] ──    │
│  │ Q: Why do you want to work at TechCo?        │    │
│  │ A: I'm drawn to the scale of your...         │    │
│  │                                               │    │
│  │ Q: Describe your experience with distributed  │    │
│  │ A: At BetterOS, I architected...              │    │
│                                                      │
│  ── CV Used ──────────────────────── [Link CV] ──    │
│  │ 📄 backend-fintech-v2.docx                   │    │
│  │    Based on: Base CV v3                       │    │
│  │    [Download] [View text]                     │    │
│                                                      │
│  ── Notes ───────────────────────────────────        │
│  │ Recruiter seemed interested in Railway exp.   │    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Q&A Vault (`/qa`)

```
┌──────────────────────────────────────────────────────┐
│  Q&A Vault                                  [+ New]  │
├──────────────────────────────────────────────────────┤
│  🔍 Search all questions and answers...              │
│                                                      │
│  Tags: [all] [leadership] [technical] [motivation]   │
│        [salary] [culture] [experience]               │
├──────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────┐      │
│  │ Q: Tell us about a time you led a team      │      │
│  │    through a difficult technical decision    │      │
│  │ A: At BetterOS, when we needed to split     │      │
│  │    the monolith into...                     │      │
│  │ Tags: leadership, technical                 │      │
│  │ Used for: TechCo, FinApp          [Copy 📋]│      │
│  └────────────────────────────────────────────┘      │
│                                                      │
│  ┌────────────────────────────────────────────┐      │
│  │ Q: Why are you looking for a new role?      │      │
│  │ A: I'm looking to expand my impact...       │      │
│  │ Tags: motivation                            │      │
│  │ Used for: General (not linked)    [Copy 📋]│      │
│  └────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────┘
```

### CV Manager (`/cv`)

```
┌──────────────────────────────────────────────────────┐
│  CV Manager                                          │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ── Base CV ──────────────────────── [Upload New] ── │
│  │ ✅ v3 (active) — base-cv-v3.docx    Jun 2024 │   │
│  │    v2 — base-cv-v2.docx              Mar 2024 │   │
│  │    v1 — base-cv-v1.docx              Jan 2024 │   │
│                                                      │
│  ── Tailored Variants ───────────────────────────    │
│  │ 📄 backend-fintech-v2.docx                    │   │
│  │    Based on: v3 │ Source: AI generated         │   │
│  │    Used by: TechCo, FinApp                     │   │
│  │    [Download] [View] [Reuse for new app]       │   │
│  │                                                │   │
│  │ 📄 fullstack-startup.docx                     │   │
│  │    Based on: v3 │ Source: Manual               │   │
│  │    Used by: StartupXYZ                         │   │
│  │    [Download] [View] [Reuse for new app]       │   │
│  │                                                │   │
│  │ 📄 infra-lead-enterprise.pdf                  │   │
│  │    Based on: v2 │ Source: AI generated         │   │
│  │    Used by: BigBank, CloudInc                  │   │
│  │    [Download] [View] [Reuse for new app]       │   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### AI Tailor Workspace (`/cv/tailor`)

```
┌──────────────────────────────────────────────────────┐
│  AI CV Tailor                          💰 ~$0.04     │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Base CV: [v3 (active) ▾]     Application: [TechCo ▾]│
│                                                      │
│  ┌─────────────────────┐  ┌─────────────────────┐   │
│  │ Job Description      │  │ AI Analysis          │   │
│  │                      │  │                      │   │
│  │ We're looking for a  │  │ ✅ Strong match:     │   │
│  │ backend lead with    │  │ PostgreSQL, Docker,  │   │
│  │ experience in:       │  │ CI/CD, team lead     │   │
│  │ - PostgreSQL         │  │                      │   │
│  │ - Docker/K8s         │  │ ⚠️ Gaps to address:  │   │
│  │ - CI/CD pipelines    │  │ K8s (you have Docker │   │
│  │ - Team leadership    │  │ but not K8s), mention│   │
│  │ - Event-driven arch  │  │ LISTEN/NOTIFY as     │   │
│  │                      │  │ event-driven exp     │   │
│  │ [Paste or load from  │  │                      │   │
│  │  application]        │  │ 📝 Suggested changes:│   │
│  │                      │  │ 1. Lead with infra   │   │
│  │                      │  │    section...        │   │
│  │                      │  │ 2. Reword bullet 3...│   │
│  │                      │  │ 3. Add keyword...    │   │
│  │                      │  │                      │   │
│  │                      │  │ ▼ Full tailored CV   │   │
│  │                      │  │ [editable text area] │   │
│  └─────────────────────┘  └─────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ 💬 Refine: "Make PostgreSQL experience more   │    │
│  │    prominent and add Railway deployment exp"  │    │
│  │                                    [Send ▶]  │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  [Accept & Save as Variant]  [Start Over]  [History] │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### AI Session History (`/ai/sessions`)

```
┌──────────────────────────────────────────────────────┐
│  AI Sessions                      Total: ~$1.24 MTD  │
├──────────────────────────────────────────────────────┤
│  Date     │ Application      │ Tokens  │ Cost │Status│
│  ─────────────────────────────────────────────────── │
│  Feb 27   │ TechCo Backend   │ 6,420   │$0.04 │ ✅   │
│  Feb 26   │ FinApp Sr. Eng   │ 8,102   │$0.06 │ ✅   │
│  Feb 25   │ CloudInc Platform│ 5,890   │$0.03 │ ❌   │
│  Feb 24   │ (manual JD)      │ 7,210   │$0.05 │ ✅   │
│                                                      │
│  Click any row to review the full prompt & response  │
└──────────────────────────────────────────────────────┘
```

---

## Build Phases

### Phase 0: Effect TS Playground (Day 0)

**Goal:** Run all 7 lessons from the Effect TS Primer above. Understand the basics before touching JobForge code.

**Tasks:**

1. `mkdir effect-playground && cd effect-playground && bun init`
2. `bun add effect`
3. Work through Lessons 1-7, running each file with `bun <file>.ts`
4. Experiment: modify the examples, break things, see what happens
5. Read the Effect docs on [effect.website](https://effect.website) for any concepts that feel unclear

**Deliverable:** You can write Effect.gen, use pipe, define TaggedErrors, create Services with Layers, and wrap Promises with tryPromise.

---

### Phase 1: Foundation (Days 1-3)

**Goal:** App boots with Bun, database connected, MinIO ready, Effect services wired up, basic application CRUD works.

**Tasks:**

1. Initialize TanStack Start project with Bun: `bun create tanstack-app jobforge`
2. Set up `flake.nix` for dev environment (Bun + Docker)
3. Create `docker-compose.yml` (PostgreSQL + MinIO + init)
4. `bun add effect @effect/sql @effect/sql-pg @effect/platform-bun @aws-sdk/client-s3`
5. Define Effect error types in `lib/errors.ts`
6. Create DatabaseService + StorageService as Effect Services
7. Create Effect Schema definitions + PgMigrator migration files: `bun db:migrate`
8. Build Application Tracker with Effect-powered server functions
9. Seed script with sample data: `bun db:seed`

**Deliverable:** You can add, view, edit, and filter job applications. All server functions use Effect with typed errors.

---

### Phase 2: Q&A Vault (Days 4-5)

**Goal:** Store and search Q&A entries, linked to applications.

**Tasks:**

1. Q&A CRUD server functions (Effect.gen + DatabaseService)
2. PostgreSQL full-text search trigger (tsvector)
3. Q&A list page with search bar
4. Tag filtering
5. Embed Q&A section in application detail page
6. Copy-to-clipboard button

**Deliverable:** Q&A entries stored, searchable, and linked to applications.

---

### Phase 3: CV Version Manager (Days 6-8)

**Goal:** Upload, store, version, and link CV files.

**Tasks:**

1. StorageService methods: `upload`, `download`, `delete` (wrapping S3)
2. Text extraction with Effect.tryPromise (mammoth + pdf-parse)
3. Base CV upload + version management
4. Variant upload with metadata
5. Link variants to applications (junction table)
6. File download + inline text preview

**Deliverable:** Full CV lifecycle with typed errors at every step.

---

### Phase 4: AI CV Tailor (Days 9-12)

**Goal:** In-app AI-powered CV tailoring with Agent SDK.

**Tasks:**

1. `bun add @anthropic-ai/claude-agent-sdk zod`
2. Create custom MCP tools (using Effect internally, Promise at boundary)
3. Build tailoring system prompt
4. Server function: `tailorCV` with SSE streaming
5. AI Tailor workspace UI
6. Session persistence in `ai_sessions` table
7. Cost tracking (input/output tokens per session)

**Deliverable:** Full agentic CV tailoring — select application, agent fetches CV + JD, streams analysis, saves variants.

---

### Future Ideas (Post-MVP)

- **Effect Stream** for real-time SSE from Agent SDK
- **@effect/platform-bun** for Bun-native HTTP client in services
- **Effect Metrics** for tracking API usage and costs
- **SqlResolver** request batching for N+1 optimization
- Email integration, analytics, timeline view, cover letter vault

---

## Database Layer — No ORM, Effect SQL + Effect Schema

### Decision: Why Not an ORM?

| Decision                | Details                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Who picked Drizzle?** | Claude (previous session) assumed Drizzle ORM without asking. You never requested it.                          |
| **Your ORM history**    | Prisma in Pathfinder and BetterOS. Drizzle only in a one-off batch processing project (Aug 2024).              |
| **Why drop it**         | This is a learning playground — ORM hides SQL behind abstractions. Writing raw SQL teaches more.               |
| **Replacement**         | `@effect/sql-pg` — Effect-native tagged template SQL, built-in migrations, Schema validation. No ORM overhead. |

### What Replaces What

```
Drizzle ORM schema         →  PostgreSQL tables (raw SQL in migration files)
Drizzle query builder      →  @effect/sql tagged templates (sql`SELECT...`)
Drizzle type inference      →  Effect Schema classes (runtime validation + TS types)
drizzle-kit migrations     →  PgMigrator from @effect/sql-pg (.ts files exporting Effects)
Zod (DB validation)        →  Effect Schema (Zod kept ONLY for Agent SDK tool schemas)
```

### How @effect/sql-pg Works

#### Connection (PgClient Layer)

```typescript
// db/client.ts
import { PgClient } from "@effect/sql-pg";
import { Config } from "effect";

// A Layer — reads config from env, creates connection pool.
// Provide once at app entry. Every service that yields SqlClient gets it.
export const DatabaseLive = PgClient.layerConfig({
  url: Config.redacted("DATABASE_URL"),
});
```

#### Queries (SqlClient tagged templates)

```typescript
// db/repos/application.repo.ts
import { SqlClient } from "@effect/sql";
import { Effect } from "effect";

const findByStatus = (status: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    // Tagged template — auto parameter binding, SQL injection safe
    const results = yield* sql`
      SELECT * FROM applications
      WHERE status = ${status}
      ORDER BY created_at DESC
    `;
    return results;
  });

// Transactions (composable, nested with savepoints)
const transferStatus = (id: string, newStatus: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    yield* sql.withTransaction(
      Effect.gen(function* () {
        yield* sql`UPDATE applications SET status = ${newStatus} WHERE id = ${id}`;
        yield* sql`INSERT INTO application_history (application_id, status) VALUES (${id}, ${newStatus})`;
      }),
    );
  });
```

#### Schema Validation (Effect Schema)

```typescript
// db/schema/application.ts
import { Schema } from "effect";

// One definition → TypeScript type + runtime validator + DB row decoder
export class Application extends Schema.Class<Application>("Application")({
  id: Schema.String,
  company: Schema.String,
  role: Schema.String,
  status: Schema.Literal(
    "draft",
    "applied",
    "screening",
    "interview",
    "offer",
    "rejected",
    "withdrawn",
  ),
  created_at: Schema.DateFromSelf,
  updated_at: Schema.DateFromSelf,
}) {}

// Use with SqlResolver for runtime-validated queries:
import { SqlResolver } from "@effect/sql";

const FindById = SqlResolver.findById("FindApplicationById", {
  Id: Schema.String,
  Result: Application,
  ResultId: (_) => _.id,
  execute: (ids) => sql`SELECT * FROM applications WHERE ${sql.in("id", ids)}`,
});
```

#### Migrations (PgMigrator)

```
db/
├── migrations/
│   ├── 0001_create_applications.ts
│   ├── 0002_create_qa_entries.ts
│   ├── 0003_create_cv_tables.ts
│   ├── 0004_add_fts_trigger.ts
│   └── 0005_create_ai_sessions.ts
└── migrate.ts
```

Each migration file exports an Effect:

```typescript
// db/migrations/0001_create_applications.ts
import { SqlClient } from "@effect/sql";
import { Effect } from "effect";

export default Effect.flatMap(
  SqlClient.SqlClient,
  (sql) => sql`
    CREATE TABLE applications (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company     VARCHAR(255) NOT NULL,
      role        VARCHAR(255) NOT NULL,
      url         TEXT,
      status      VARCHAR(50) NOT NULL DEFAULT 'draft',
      job_description TEXT,
      salary_range VARCHAR(100),
      location    VARCHAR(255),
      platform    VARCHAR(100),
      contact_name VARCHAR(255),
      contact_email VARCHAR(255),
      notes       TEXT,
      applied_at  TIMESTAMPTZ,
      next_action TEXT,
      next_action_date TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
);
```

Runner script:

```typescript
// db/migrate.ts — run with: bun db:migrate
import { PgMigrator } from "@effect/sql-pg";
import { NodeContext } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { fileURLToPath } from "node:url";
import { DatabaseLive } from "./client";

const MigratorLive = PgMigrator.layer({
  loader: PgMigrator.fromFileSystem(
    fileURLToPath(new URL("migrations", import.meta.url)),
  ),
}).pipe(Layer.provide([DatabaseLive, NodeContext.layer]));

Effect.runPromise(
  Effect.provide(Effect.log("Migrations applied!"), MigratorLive),
);
```

#### Seeding (just an Effect program)

```typescript
// db/seed.ts — run with: bun db:seed
import { SqlClient } from "@effect/sql";
import { Effect } from "effect";
import { DatabaseLive } from "./client";

const seed = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`DELETE FROM applications`;
  yield* sql`
    INSERT INTO applications (company, role, status, platform, location) VALUES
    ('TechCo', 'Backend Lead', 'applied', 'LinkedIn', 'Remote'),
    ('FinApp', 'Sr. Engineer', 'interview', 'Referral', 'Singapore'),
    ('CloudInc', 'Platform Eng', 'screening', 'Company site', 'Remote'),
    ('StartupXYZ', 'Fullstack Dev', 'applied', 'LinkedIn', 'Jakarta'),
    ('BigBank', 'Infra Engineer', 'rejected', 'LinkedIn', 'Singapore')
  `;

  yield* Effect.log("Seed data inserted!");
});

Effect.runPromise(seed.pipe(Effect.provide(DatabaseLive)));
```

### Packages to Install

```bash
bun add effect @effect/sql @effect/sql-pg @effect/platform-bun
# Also for AI (Phase 4):
# bun add @anthropic-ai/claude-agent-sdk zod
```

### Things to Verify in Phase 0 Scratch Project

Before building on assumptions, test these in `effect-playground/`:

1. **`@effect/platform-bun`** — Does `BunContext.layer` exist, or use `NodeContext` on Bun?
2. **`Schema.UUID`** — Built-in or needs custom branded type?
3. **`Schema.optionalWith` nullable syntax** — Exact API for nullable optional fields
4. **`.ts` migration files** — Do they work with `PgMigrator.fromFileSystem()` on Bun?
5. **`sql.insert()` + Schema classes** — Accepts instances directly or needs `.fields`?
6. **`sql<Type>` generic** — Just a type cast, or does it do runtime validation?

---

## Verified Resources & References

> Every resource below was fetched and verified. Tagged: ✅ Official, 📝 Community tutorial.

### ✅ Official Effect Documentation

| Resource                            | URL                                                         |
| ----------------------------------- | ----------------------------------------------------------- |
| Effect main docs                    | https://effect.website/docs/                                |
| Effect installation (Bun supported) | https://effect.website/docs/getting-started/installation/   |
| Effect Schema intro                 | https://effect.website/docs/schema/introduction/            |
| Effect Schema — Classes             | https://effect.website/docs/schema/classes/                 |
| Effect Services & Layers            | https://effect.website/docs/requirements-management/layers/ |
| Effect Configuration                | https://effect.website/docs/configuration/                  |
| Full API reference                  | https://effect-ts.github.io/effect/                         |

### ✅ Official @effect/sql + @effect/sql-pg

| Resource                 | URL                                                          |
| ------------------------ | ------------------------------------------------------------ |
| Effect SQL landing page  | https://effect-sql.swiftace.org/                             |
| @effect/sql npm          | https://www.npmjs.com/package/@effect/sql                    |
| PgClient API reference   | https://effect-ts.github.io/effect/sql-pg/PgClient.ts.html   |
| PgMigrator API reference | https://effect-ts.github.io/effect/sql-pg/PgMigrator.ts.html |
| Effect GitHub monorepo   | https://github.com/Effect-TS/effect                          |

### 📝 Community Tutorials (patterns verified across multiple sources)

| Resource                                                               | URL                                                                                         |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Martin Persson — Full Effect API tutorial (SqlResolver, repos, Schema) | https://dev.to/martinpersson/building-robust-typescript-apis-with-the-effect-ecosystem-1m7c |
| Typeonce — Backend with Effect (PgClient, PgMigrator, SqlClient)       | https://www.typeonce.dev/article/how-to-implement-a-backend-with-effect                     |
| Mufraggi — Effect migration tutorial                                   | https://mufraggi.eu/articles/effect-typescript-database-migration                           |
| Drizzle — Effect integration (for reference, not used)                 | https://orm.drizzle.team/docs/connect-effect-postgres                                       |

### Community

| Resource       | URL                            |
| -------------- | ------------------------------ |
| Effect Discord | https://discord.gg/effect-ts   |
| Effect YouTube | https://youtube.com/@effect-ts |

---

## Getting Started

```bash
# Enter dev shell
nix develop

# Start infrastructure
docker compose up -d

# Install dependencies
bun install

# Run migrations
bun db:migrate

# Seed sample data (optional)
bun db:seed

# Start dev server
bun dev

# Run tests
bun test

# Open app
open http://localhost:3000

# MinIO console
open http://localhost:9001
```
