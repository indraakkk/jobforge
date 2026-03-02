# Effect TS Learning Guide — JobForge Implementation

> A deep-dive into every Effect TS pattern used in JobForge, **why** each pattern
> exists, how our code matches the recommended approach, and alternative examples
> to solidify understanding.

---

## Table of Contents

1. [Effects Are Lazy Blueprints](#1-effects-are-lazy-blueprints)
2. [The Three Channels: `<A, E, R>`](#2-the-three-channels-a-e-r)
3. [Understanding yield* — The Engine Behind Effect.gen](#3-understanding-yield--the-engine-behind-effectgen)
4. [Effect.gen — Sequential Code That Feels Imperative](#4-effectgen--sequential-code-that-feels-imperative)
5. [Schema.Class — Domain Models as Validated Types](#5-schemaclass--domain-models-as-validated-types)
6. [Schema.TaggedError — Type-Safe Error Definitions](#6-schemataggederror--type-safe-error-definitions)
7. [Schema.transform — Bridging Data Representations](#7-schematransform--bridging-data-representations)
8. [Schema.decodeUnknown — Validation at the Boundary](#8-schemadecodeunknown--validation-at-the-boundary)
9. [Effect.Service — Modern Service Definitions](#9-effectservice--modern-service-definitions)
10. [Context.Tag + Layer.succeed — Classic Service Pattern](#10-contexttag--layersucceed--classic-service-pattern)
11. [Layer Composition — Building the Dependency Graph](#11-layer-composition--building-the-dependency-graph)
12. [Effect.tryPromise — Wrapping Async/Promise Code](#12-effecttrypromise--wrapping-asyncpromise-code)
13. [Error Handling: yield*, mapError, catchTag](#13-error-handling-yield-maperror-catchtag)
14. [Config — Environment Variables the Effect Way](#14-config--environment-variables-the-effect-way)
15. [pipe — Composing Operations Top-to-Bottom](#15-pipe--composing-operations-top-to-bottom)
16. [SQL Integration with @effect/sql-pg](#16-sql-integration-with-effectsql-pg)
17. [Effect Boundary — Where Effect Stops and React Begins](#17-effect-boundary--where-effect-stops-and-react-begins)
18. [Testing with Effect](#18-testing-with-effect)
19. [Anti-Patterns to Avoid](#19-anti-patterns-to-avoid)
20. [Pattern Comparison Summary](#20-pattern-comparison-summary)

---

## 1. Effects Are Lazy Blueprints

### What the pattern says

An `Effect` is **not** a value and **not** a Promise. It's an immutable *blueprint*
describing a computation. It does nothing until explicitly executed by a runtime
(`Effect.runPromise`, `Effect.runSync`).

### Why this matters

```typescript
// ❌ A Promise executes IMMEDIATELY when created
const promise = fetch("/api/users"); // network request fires NOW

// ✅ An Effect does NOTHING until you run it
const effect = Effect.tryPromise(() => fetch("/api/users")); // just a description
// ... later ...
Effect.runPromise(effect); // NOW it fires
```

This laziness gives you:
- **Composability** — build complex workflows from small pieces before executing
- **Retryability** — retry the same effect without rebuilding it
- **Testability** — inspect and transform effects without side-effects

### How JobForge uses this

Every service method returns an `Effect`, not a value:

```typescript
// src/lib/services/ApplicationService.ts
getById: (id: string) => Effect.gen(function* () {
  // This block is a BLUEPRINT — it doesn't run until someone calls runPromise
  const rows = yield* sql`SELECT * FROM applications WHERE id = ${id}`;
  // ...
})
```

The actual execution happens at the boundary — in server functions:

```typescript
// Server function (React ↔ Effect bridge)
export async function getApplication(id: string) {
  return Effect.runPromise(
    applicationService.getById(id).pipe(Effect.provide(AppLive))
  );
}
```

### Another example to internalize this

```typescript
// Imagine building a recipe (Effect) vs cooking it (runPromise)

const recipe = Effect.gen(function* () {
  const dough = yield* makeDough;      // step 1 description
  const shaped = yield* shapeBread(dough); // step 2 description
  const baked = yield* bake(shaped);    // step 3 description
  return baked;
});
// Nothing happened yet. No flour was mixed.

// NOW we cook:
const bread = await Effect.runPromise(recipe);
// All three steps execute in sequence
```

**Key insight**: You can pass `recipe` around, compose it with other effects,
retry it, add timeouts — all without doing any actual work.

---

## 2. The Three Channels: `<A, E, R>`

### What the pattern says

Every `Effect<A, E, R>` has three type parameters:
- **A** (Success) — what the effect produces when it succeeds
- **E** (Error) — what typed errors it can fail with
- **R** (Requirements) — what services/dependencies it needs to run

### Why this matters

TypeScript's regular functions only track the return type. Effect tracks
**all three concerns** at the type level:

```typescript
// Regular TypeScript — what can go wrong? Who knows!
async function getUser(id: string): Promise<User> { ... }

// Effect — the type tells the FULL story
function getUser(id: string): Effect<User, UserNotFoundError, UserRepository>
//                                    ^A     ^E                  ^R
// "Returns User, can fail with UserNotFoundError, needs UserRepository"
```

The compiler now enforces:
1. You handle `UserNotFoundError` before running
2. You provide `UserRepository` before running
3. The success path gives you `User`

### How JobForge uses this

```typescript
// ApplicationService.getById has this inferred type:
// Effect<Application, ApplicationNotFoundError | SqlError, SqlClient>
//        ^^^^^^^^^^   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^    ^^^^^^^^^
//        A (success)  E (possible errors)                  R (needs DB)

getById: (id: string) => Effect.gen(function* () {
  const rows = yield* sql`SELECT * FROM applications WHERE id = ${id}`;
  if (rows.length === 0) {
    return yield* new ApplicationNotFoundError({ id }); // adds to E channel
  }
  return yield* decodeApplication(rows[0]); // A channel
})
```

You never see the type annotation — **Effect infers it automatically** from
what you `yield*` inside the generator.

### Another example

```typescript
// A function that reads config, fetches from DB, and might fail
const getActiveUsers = Effect.gen(function* () {
  const config = yield* Config.string("MAX_USERS");  // R: ConfigProvider
  const sql = yield* SqlClient.SqlClient;              // R: SqlClient
  const rows = yield* sql`SELECT * FROM users WHERE active = true LIMIT ${config}`;
  if (rows.length === 0) {
    return yield* new NoUsersFoundError();              // E: NoUsersFoundError
  }
  return rows;                                          // A: Row[]
});

// Inferred: Effect<Row[], NoUsersFoundError, ConfigProvider | SqlClient>
//                  ^^^^   ^^^^^^^^^^^^^^^^   ^^^^^^^^^^^^^^^^^^^^^^^^^
// TypeScript KNOWS all three channels without you writing any annotations
```

---

## 3. Understanding yield\* — The Engine Behind Effect.gen

### What even is this syntax?

If you come from normal JavaScript/TypeScript, `yield*` looks alien. Let's
build up from zero.

#### Step 1: Regular functions run straight through

```typescript
function greet(name: string) {
  console.log("Hello");     // runs
  console.log(name);        // runs immediately after
  return "done";            // returns, function is finished
}
greet("Alice");
// Output: "Hello", "Alice"
```

Nothing special. The function runs top-to-bottom, then it's done.

#### Step 2: Generator functions can PAUSE

A **generator function** has a `*` after `function`. It doesn't run to
completion when called — it returns an **iterator** that you step through:

```typescript
function* countUp() {
  console.log("starting");
  yield 1;        // ← PAUSE here, hand back 1
  console.log("resumed");
  yield 2;        // ← PAUSE here, hand back 2
  console.log("finishing");
  return 3;       // done
}

const gen = countUp();     // nothing runs yet! just creates the iterator
gen.next();                // prints "starting", returns { value: 1, done: false }
gen.next();                // prints "resumed",  returns { value: 2, done: false }
gen.next();                // prints "finishing", returns { value: 3, done: true }
```

**Key concept**: `yield` is a **pause button**. The function stops at each
`yield`, gives a value to the caller, and waits. The caller calls `.next()`
to resume it.

Think of it like a conversation:
- Generator: "Here's 1, I'll wait." *(pauses)*
- Caller: "OK continue." *(calls .next())*
- Generator: "Here's 2, I'll wait." *(pauses)*
- Caller: "OK continue." *(calls .next())*
- Generator: "Here's 3, I'm done."

#### Step 3: The caller can SEND values back in

`.next(value)` doesn't just resume — it can **inject a value** back into
the generator. The injected value becomes the result of the `yield` expression:

```typescript
function* askForStuff() {
  const name = yield "What is your name?";     // pause, receive answer
  const age  = yield "How old are you?";       // pause, receive answer
  return `${name} is ${age} years old`;
}

const gen = askForStuff();
gen.next();              // { value: "What is your name?", done: false }
gen.next("Alice");       // injects "Alice" → name = "Alice"
                         // { value: "How old are you?", done: false }
gen.next(30);            // injects 30 → age = 30
                         // { value: "Alice is 30 years old", done: true }
```

This is the **magic trick** that Effect uses:

1. Generator **yields** an Effect (a description of work)
2. Effect runtime **executes** that work
3. Runtime **sends the result back** via `.next(result)`
4. Generator receives the result as a plain value and continues

#### Step 4: `yield` vs `yield*` — what's the star?

`yield` pauses and hands **one value** to the caller.

`yield*` **delegates** to another iterable/generator. It's like saying
"run this entire other generator and give me its final result":

```typescript
function* inner() {
  yield 10;
  yield 20;
  return 30;    // ← this becomes the value of yield*
}

function* outer() {
  const result = yield* inner();   // delegates to inner()
  // result = 30 (the return value of inner)
  console.log(result);
}

// yield* runs ALL of inner's yields, then gives you its return value
```

Without the star:

```typescript
function* outer() {
  const result = yield inner();    // yields the GENERATOR OBJECT itself
  // result = [Generator object] — NOT what you want!
}
```

**Summary**:
- `yield value` → pause, hand `value` to caller
- `yield* otherGenerator` → run `otherGenerator` to completion, get its return value

### Why Effect uses yield\*

Now the punchline. Effect makes its types **iterable** (they implement the
iterator protocol). When you write:

```typescript
const program = Effect.gen(function* () {
  const user = yield* fetchUser(id);
  return user.name;
});
```

Here's what actually happens under the hood:

```
Step 1: Generator yields the Effect `fetchUser(id)` to Effect.gen
Step 2: Effect.gen receives the Effect, RUNS it (database query, API call, etc.)
Step 3: Effect.gen sends the SUCCESS VALUE back into the generator via .next(user)
Step 4: Generator receives `user` as a plain value and continues
Step 5: If the Effect FAILED, Effect.gen calls .throw(error) on the generator
        → generator stops, error propagates through the E channel
```

So `yield*` is the bridge that lets you write **synchronous-looking code**
while Effect handles all the async execution behind the scenes:

```typescript
// What you WRITE (looks synchronous):
const program = Effect.gen(function* () {
  const user = yield* fetchUser(id);          // "give me a user"
  const posts = yield* fetchPosts(user.id);   // "give me their posts"
  return { user, posts };
});

// What ACTUALLY HAPPENS (async, managed by Effect):
// 1. fetchUser(id) → Effect runtime executes DB query → gets user → sends back
// 2. fetchPosts(user.id) → Effect runtime executes DB query → gets posts → sends back
// 3. Returns { user, posts }
```

### The await analogy

If you know `async/await`, here's the direct mapping:

```typescript
// async/await world
async function getUser(id: string) {
  const response = await fetch(`/api/users/${id}`);  // pause, wait for Promise
  const user = await response.json();                 // pause, wait for Promise
  return user;
}

// Effect world
const getUser = (id: string) => Effect.gen(function* () {
  const response = yield* httpClient.get(`/api/users/${id}`);  // pause, wait for Effect
  const user = yield* decodeUser(response.body);                // pause, wait for Effect
  return user;
});
```

| async/await | Effect.gen |
|-------------|------------|
| `async function` | `Effect.gen(function* () { ... })` |
| `await promise` | `yield* effect` |
| Returns `Promise<A>` | Returns `Effect<A, E, R>` |
| Errors: untyped catch | Errors: typed E channel |
| Dependencies: implicit | Dependencies: tracked in R |

**But `yield*` gives you MORE than `await`**:
- `await` only knows success/failure — `yield*` tracks error **types**
- `await` doesn't track dependencies — `yield*` feeds the R channel
- `await` executes immediately — `yield*` inside a generator is lazy

### What can you yield\*?

In Effect's `Effect.gen`, you can `yield*` anything that Effect knows how to run:

```typescript
Effect.gen(function* () {
  // 1. Another Effect
  const user = yield* fetchUser(id);

  // 2. A service tag (gets the service from context)
  const sql = yield* SqlClient.SqlClient;

  // 3. A Config value
  const apiKey = yield* Config.string("API_KEY");

  // 4. A tagged error (causes the Effect to FAIL)
  if (!user) {
    return yield* new UserNotFoundError({ id });
    // ↑ execution stops here, error goes to E channel
  }

  // 5. A Schema decode operation (Effect that can fail with ParseError)
  const validated = yield* Schema.decodeUnknown(UserSchema)(rawData);

  // 6. An Effect.forEach (processes a collection)
  const posts = yield* Effect.forEach(ids, (id) => fetchPost(id));

  return user;
});
```

### How JobForge uses yield\* — every pattern

#### Pattern 1: Acquiring a dependency

```typescript
// src/lib/services/ApplicationService.ts
effect: Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  //    ^^^           ^^^^^^^^^^^^^^^^^
  //    result        Context.Tag — "give me the SQL client from context"
  //
  // Effect looks up SqlClient in the provided layers,
  // sends the concrete client back into the generator
```

**What happens**: `SqlClient.SqlClient` is a `Context.Tag`. When you `yield*`
a tag inside `Effect.gen`, Effect looks it up in the provided layer (like
dependency injection) and gives you the concrete implementation.

#### Pattern 2: Running a SQL query

```typescript
const rows = yield* sql`SELECT * FROM applications WHERE id = ${id}`;
//    ^^^^         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//    Row[]        tagged template returns Effect<Row[], SqlError>
//
// Effect runs the query, waits for result, sends rows back
```

**What happens**: `` sql`...` `` returns an `Effect<Row[], SqlError>`. The
`yield*` hands this effect to the runtime, which executes the query and
returns the rows.

#### Pattern 3: Failing with an error

```typescript
if (rows.length === 0) {
  return yield* new ApplicationNotFoundError({ id });
  //            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //            TaggedError is yieldable — causes the Effect to FAIL
}
```

**What happens**: `Schema.TaggedError` implements the iterable protocol
such that `yield*`-ing it **fails** the effect. Execution stops. The error
goes into the E channel. Code after this line never runs.

This is like `throw` but:
- The error type is tracked by the compiler
- It flows through the typed error channel
- It can be caught later with `catchTag`

#### Pattern 4: Decoding with error mapping

```typescript
return yield* decodeApplication(rows[0]).pipe(
  Effect.mapError(() => new SqlError({ ... })),
);
//     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//     Effect<Application, SqlError> after the mapError
//
// 1. decodeApplication runs Schema validation
// 2. If valid → sends Application back
// 3. If invalid → mapError transforms ParseError to SqlError → fails
```

#### Pattern 5: Processing multiple rows

```typescript
const apps = yield* Effect.forEach(rows, (row) =>
  decodeApplication(row).pipe(Effect.mapError(() => ...))
);
//   ^^^^
//   Application[] — all decoded rows
//
// Effect.forEach processes each row, collecting results
// If ANY row fails to decode, the entire thing fails
```

### Mental model: yield\* is "please do this for me"

Every time you write `yield*`, you're handing a **job description** to the
Effect runtime and saying "please do this and give me back the result":

```typescript
Effect.gen(function* () {
  // "Please give me the database client"
  const sql = yield* SqlClient.SqlClient;

  // "Please run this query"
  const rows = yield* sql`SELECT * FROM users`;

  // "Please validate this data"
  const users = yield* Effect.forEach(rows, (r) => decodeUser(r));

  // "Please fail with this error if empty"
  if (users.length === 0) {
    return yield* new NoUsersError();
  }

  // "Here's the final result"
  return users;
});
```

You write what looks like synchronous, step-by-step code. Effect handles
all the async execution, error propagation, and dependency injection
behind the scenes. That's the entire point of `yield*` in Effect.

### Quick reference card

```
┌─────────────────────────────────────────────────────────────┐
│  yield* <Effect>          → run it, give me the result      │
│  yield* <Context.Tag>     → look up service in layers       │
│  yield* <Config.X>        → read environment variable       │
│  yield* <TaggedError>     → FAIL the effect with this error │
│  yield* <Schema.decode>   → validate data, get typed result │
│  yield* Effect.forEach    → process collection, get array   │
│  yield* Effect.all({...}) → run multiple effects in parallel│
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Effect.gen — Sequential Code That Feels Imperative

### What the pattern says

`Effect.gen(function* () { ... })` lets you write sequential effect code using
`yield*` instead of chaining `.flatMap()` calls.

### Why this matters

Compare:

```typescript
// ❌ Nested flatMap chains — hard to read
const program = fetchUser(id).pipe(
  Effect.flatMap((user) =>
    fetchPosts(user.id).pipe(
      Effect.flatMap((posts) =>
        fetchComments(posts[0].id).pipe(
          Effect.map((comments) => ({ user, posts, comments }))
        )
      )
    )
  )
);

// ✅ Effect.gen — reads like synchronous code
const program = Effect.gen(function* () {
  const user = yield* fetchUser(id);
  const posts = yield* fetchPosts(user.id);
  const comments = yield* fetchComments(posts[0].id);
  return { user, posts, comments };
});
```

Same behavior, vastly better readability. Each `yield*` unwraps the success
value from the Effect — similar to `await` for Promises.

### How JobForge uses this

**Every service method** uses `Effect.gen`:

```typescript
// src/lib/services/QAService.ts
create: (data: typeof CreateQAEntry.Type) =>
  Effect.gen(function* () {
    const rows = yield* sql`
      INSERT INTO qa_entries (application_id, question, answer, tags)
      VALUES (${data.application_id}, ${data.question}, ${data.answer}, ${data.tags}::text[])
      RETURNING *
    `;
    return yield* decodeRow(rows[0]);
  }),
```

And service *construction* also uses `Effect.gen`:

```typescript
// The outer generator acquires dependencies
effect: Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;  // grab DB client from context
  return {
    create: (...) => Effect.gen(function* () { ... }),
    getById: (...) => Effect.gen(function* () { ... }),
  } as const;
}),
```

### Another example

```typescript
// Business workflow: place an order
const placeOrder = (cart: Cart, userId: string) =>
  Effect.gen(function* () {
    const user = yield* userService.findById(userId);
    const validated = yield* validateCart(cart);
    const payment = yield* paymentService.charge(user, validated.total);
    const order = yield* orderService.create(user, validated, payment.id);
    yield* emailService.sendConfirmation(user.email, order);
    return order;
  });
// Each yield* can fail — errors propagate automatically via the E channel
// If paymentService.charge fails, emailService.sendConfirmation never runs
```

---

## 5. Schema.Class — Domain Models as Validated Types

### What the pattern says

`Schema.Class` creates a class that is simultaneously:
1. A TypeScript type (compile-time)
2. A runtime validator/decoder
3. A constructor

### Why this matters

In plain TypeScript, a `type` or `interface` disappears at runtime — you can't
validate data against it. `Schema.Class` gives you both:

```typescript
// Plain TS — type exists only at compile time
interface User { name: string; age: number; }
// You can pass { name: 123, age: "old" } at runtime and TS won't stop it

// Schema.Class — type AND runtime validation in one
class User extends Schema.Class<User>("User")({
  name: Schema.String,
  age: Schema.Number,
}) {}
// Now you can validate: Schema.decodeUnknownSync(User)({ name: 123 }) // THROWS
```

### How JobForge uses this

Three schema variants per domain entity:

```typescript
// src/lib/schemas/application.ts

// 1. Full entity (from DB)
class Application extends Schema.Class<Application>("Application")({
  id: Schema.String,
  company: Schema.String,
  role: Schema.String,
  status: ApplicationStatus,       // Schema.Literal enum
  url: Schema.NullOr(Schema.String), // nullable field
  created_at: DateToString,        // custom transform
  // ...
}) {}

// 2. Create DTO (required + defaults)
class CreateApplication extends Schema.Class<CreateApplication>("CreateApplication")({
  company: Schema.String,           // required
  role: Schema.String,              // required
  status: Schema.optionalWith(ApplicationStatus, { default: () => "draft" as const }),
  url: Schema.optionalWith(Schema.NullOr(Schema.String), { default: () => null }),
  // ...
}) {}

// 3. Update DTO (everything optional)
class UpdateApplication extends Schema.Class<UpdateApplication>("UpdateApplication")({
  company: Schema.optional(Schema.String),
  role: Schema.optional(Schema.String),
  status: Schema.optional(ApplicationStatus),
  // ...
}) {}
```

**Pattern**: Full entity has all required fields. Create has required + defaults.
Update has all optional. This maps perfectly to INSERT vs UPDATE SQL operations.

### Key Schema building blocks used

| Schema                    | Meaning                          | JobForge usage           |
|--------------------------|----------------------------------|--------------------------|
| `Schema.String`          | Must be a string                 | `company`, `role`        |
| `Schema.NullOr(X)`      | X or null                        | `url`, `notes`           |
| `Schema.optional(X)`    | Field may be absent              | All UpdateApplication fields |
| `Schema.optionalWith(X, { default })` | Absent → default value | CreateApplication fields |
| `Schema.Literal(...)`   | Exact string values              | ApplicationStatus enum   |
| `Schema.Array(X)`       | Array of X                       | `tags` in QAEntry        |

### Another example

```typescript
// E-commerce domain
const ProductStatus = Schema.Literal("draft", "active", "archived");

class Product extends Schema.Class<Product>("Product")({
  id: Schema.String,
  name: Schema.String,
  price: Schema.Number,
  status: ProductStatus,
  category: Schema.NullOr(Schema.String),
  tags: Schema.Array(Schema.String),
  created_at: DateToString,
}) {}

class CreateProduct extends Schema.Class<CreateProduct>("CreateProduct")({
  name: Schema.String,
  price: Schema.Number,
  status: Schema.optionalWith(ProductStatus, { default: () => "draft" as const }),
  category: Schema.optionalWith(Schema.NullOr(Schema.String), { default: () => null }),
  tags: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] }),
}) {}
```

---

## 6. Schema.TaggedError — Type-Safe Error Definitions

### What the pattern says

Errors are **values**, not exceptions. Each error type has a unique `_tag` that
enables type-safe pattern matching with `Effect.catchTag`.

### Why this matters

Regular JavaScript errors are untyped — `catch(e)` gives you `unknown`.
Tagged errors give you:
1. **Type discrimination** — the compiler knows exactly which errors are possible
2. **Exhaustive handling** — you can handle each error type differently
3. **Error channel tracking** — the `E` type parameter shows all possible failures

```typescript
// ❌ Traditional — you have no idea what can fail
try {
  await doSomething();
} catch (e) {
  // e is `unknown` — could be anything
  if (e instanceof Error) console.log(e.message);
}

// ✅ Effect Tagged Errors — compiler tracks everything
Effect.gen(function* () {
  yield* doSomething();  // compiler knows: E = NotFoundError | ValidationError
}).pipe(
  Effect.catchTag("NotFoundError", (e) => ...), // e is typed as NotFoundError
  Effect.catchTag("ValidationError", (e) => ...), // e is typed as ValidationError
)
```

### How JobForge uses this

Each domain module has its own error types:

```typescript
// src/lib/errors/application.ts
export class ApplicationNotFoundError extends Schema.TaggedError<ApplicationNotFoundError>()(
  "ApplicationNotFoundError",
  { id: Schema.String }   // carry context about what wasn't found
) {}

export class ApplicationValidationError extends Schema.TaggedError<ApplicationValidationError>()(
  "ApplicationValidationError",
  { message: Schema.String }   // carry validation message
) {}
```

```typescript
// src/lib/errors/qa.ts
export class QANotFoundError extends Schema.TaggedError<QANotFoundError>()(
  "QANotFoundError",
  { id: Schema.String }
) {}
```

```typescript
// src/lib/errors/database.ts
export class DatabaseError extends Schema.TaggedError<DatabaseError>()(
  "DatabaseError",
  { message: Schema.String, cause: Schema.optional(Schema.Unknown) }
) {}
```

The pattern is consistent: `Schema.TaggedError<Self>()("UniqueTag", { fields })`.
The fields carry **context** — not just "something failed" but *what* failed and *why*.

### How errors are used in services

```typescript
// Yielding an error (like throwing, but type-safe)
if (rows.length === 0) {
  return yield* new ApplicationNotFoundError({ id });
  // ↑ This adds ApplicationNotFoundError to the E channel
  // The function after this line is unreachable — compiler knows
}
```

### Another example

```typescript
// Auth domain errors
class InvalidCredentialsError extends Schema.TaggedError<InvalidCredentialsError>()(
  "InvalidCredentialsError",
  { email: Schema.String }
) {}

class AccountLockedError extends Schema.TaggedError<AccountLockedError>()(
  "AccountLockedError",
  { email: Schema.String, lockedUntil: Schema.String }
) {}

class SessionExpiredError extends Schema.TaggedError<SessionExpiredError>()(
  "SessionExpiredError",
  { sessionId: Schema.String }
) {}

// Using them in a login flow
const login = (email: string, password: string) =>
  Effect.gen(function* () {
    const user = yield* findUser(email);
    if (user.locked) {
      return yield* new AccountLockedError({
        email,
        lockedUntil: user.lockedUntil.toISOString()
      });
    }
    if (!verifyPassword(password, user.hash)) {
      return yield* new InvalidCredentialsError({ email });
    }
    return yield* createSession(user);
  });

// Handling at the API boundary
login(email, password).pipe(
  Effect.catchTag("InvalidCredentialsError", () =>
    Effect.succeed({ status: 401, body: "Wrong credentials" })
  ),
  Effect.catchTag("AccountLockedError", (e) =>
    Effect.succeed({ status: 423, body: `Locked until ${e.lockedUntil}` })
  ),
)
```

---

## 7. Schema.transform — Bridging Data Representations

### What the pattern says

`Schema.transform` creates a bidirectional mapping between two schemas —
one for *decoding* (external → internal) and one for *encoding* (internal → external).

### Why this matters

Data from external sources (databases, APIs) often doesn't match your internal
representation. Transforms handle the conversion declaratively:

```typescript
// PostgreSQL returns Date objects for timestamptz columns
// But our app wants ISO strings

// Without transform: manual conversion scattered everywhere
const createdAt = row.created_at instanceof Date
  ? row.created_at.toISOString()
  : row.created_at; // hope for the best

// With transform: declared ONCE, applied automatically during decode
const DateToString = Schema.transform(
  Schema.Union(Schema.DateFromSelf, Schema.String),  // FROM: Date or string
  Schema.String,                                       // TO: string
  {
    decode: (val) => (val instanceof Date ? val.toISOString() : val),
    encode: (val) => val,  // encoding keeps it as string
  },
);
```

### How JobForge uses this

```typescript
// src/lib/schemas/common.ts
export const DateToString = Schema.transform(
  Schema.Union(Schema.DateFromSelf, Schema.String),
  Schema.String,
  {
    decode: (val) => (val instanceof Date ? val.toISOString() : val),
    encode: (val) => val,
  },
);
```

Then used in every schema with timestamp fields:

```typescript
// src/lib/schemas/application.ts
class Application extends Schema.Class<Application>("Application")({
  // ...
  applied_at: Schema.NullOr(DateToString),   // nullable timestamp
  created_at: DateToString,                    // required timestamp
  updated_at: DateToString,                    // required timestamp
}) {}
```

**Rationale**: The `pg` driver returns JavaScript `Date` objects for
`timestamptz` columns. But when we serialize to JSON (for React), we want
ISO strings. The `Union(DateFromSelf, String)` input accepts *both* — the
driver's Date objects AND already-converted strings (useful in tests).

### Another example

```typescript
// Cents ↔ Dollars transform
const CentsToDollars = Schema.transform(
  Schema.Number,   // DB stores cents (integer)
  Schema.Number,   // App uses dollars (float)
  {
    decode: (cents) => cents / 100,     // 1599 → 15.99
    encode: (dollars) => Math.round(dollars * 100), // 15.99 → 1599
  },
);

class Product extends Schema.Class<Product>("Product")({
  id: Schema.String,
  name: Schema.String,
  price: CentsToDollars,  // stored as 1599 in DB, decoded as 15.99 in app
}) {}

// Postgres-style boolean (stored as "t"/"f") to real boolean
const PgBoolToBoolean = Schema.transform(
  Schema.Union(Schema.Literal("t", "f"), Schema.Boolean),
  Schema.Boolean,
  {
    decode: (val) => (typeof val === "boolean" ? val : val === "t"),
    encode: (val) => val,
  },
);
```

---

## 8. Schema.decodeUnknown — Validation at the Boundary

### What the pattern says

Use `Schema.decodeUnknown(MySchema)` to validate untrusted data (DB rows, API
responses) and get a typed, validated result inside an Effect.

### Why this matters

Data from databases and APIs is `unknown` at the type level. You need a
**runtime check** to trust it:

```typescript
// ❌ Dangerous — trusting DB data blindly
const row = rows[0] as Application; // could be anything

// ✅ Safe — validate at the boundary
const decodeApplication = Schema.decodeUnknown(Application);
const app = yield* decodeApplication(row);
// If row doesn't match Application schema, the Effect fails with ParseError
```

### How JobForge uses this

Each service creates a decoder and uses it on every DB read:

```typescript
// src/lib/services/ApplicationService.ts
const decodeApplication = Schema.decodeUnknown(Application);

// Used in getById:
getById: (id: string) => Effect.gen(function* () {
  const rows = yield* sql`SELECT * FROM applications WHERE id = ${id}`;
  if (rows.length === 0) {
    return yield* new ApplicationNotFoundError({ id });
  }
  return yield* decodeApplication(rows[0]).pipe(
    Effect.mapError(() => new SqlError({
      cause: new Error("Failed to decode application row"),
      message: "Decode error",
    })),
  );
}),
```

**QAService** uses a helper function for reuse:

```typescript
// src/lib/services/QAService.ts
const _decode = Schema.decodeUnknown(QAEntry);
const decodeRow = (row: unknown) =>
  _decode(row).pipe(
    Effect.mapError(() => new SqlError({
      cause: new Error("Failed to decode QA entry row"),
      message: "Decode error",
    })),
  );
```

**Rationale**: The `decodeUnknown` returns an `Effect` — if the data doesn't
match the schema, it fails with a `ParseError`. We `mapError` to convert
parse errors into our domain error types for cleaner error handling upstream.

### Decode for arrays

```typescript
// Decoding multiple rows (ApplicationService.getAll)
const apps = yield* Effect.forEach(rows, (row) =>
  decodeApplication(row).pipe(Effect.mapError(...))
);
// Effect.forEach processes each row, collecting results or failing on first error
```

### Another example

```typescript
// API response validation
const ApiResponse = Schema.Struct({
  data: Schema.Array(Schema.Struct({
    id: Schema.Number,
    name: Schema.String,
  })),
  pagination: Schema.Struct({
    total: Schema.Number,
    page: Schema.Number,
  }),
});

const decodeResponse = Schema.decodeUnknown(ApiResponse);

const fetchUsers = Effect.gen(function* () {
  const response = yield* httpClient.get("/api/users");
  const body = yield* response.json;
  return yield* decodeResponse(body).pipe(
    Effect.mapError(() => new ApiValidationError({
      message: "Unexpected API response shape"
    }))
  );
});
```

---

## 9. Effect.Service — Modern Service Definitions

### What the pattern says

`Effect.Service` is the modern, concise way to define services. It combines
the Context Tag, default Layer, and implementation in one declaration.

### Why this matters

The classic approach requires three separate things:

```typescript
// Classic (verbose)
class MyService extends Context.Tag("MyService")<MyService, { ... }>() {}
const MyServiceLive = Layer.effect(MyService, Effect.gen(function* () { ... }));
// Then you need to remember to export both the Tag and the Layer
```

`Effect.Service` combines everything:

```typescript
// Modern (concise)
class MyService extends Effect.Service<MyService>()("MyService", {
  effect: Effect.gen(function* () { ... }),
}) {}
// MyService is the Tag, MyService.Default is the Layer — all in one
```

### How JobForge uses this

**ApplicationService** — with database dependency:

```typescript
// src/lib/services/ApplicationService.ts
export class ApplicationService extends Effect.Service<ApplicationService>()("ApplicationService", {
  dependencies: [DatabaseLayer],
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;   // acquired from dependency
    return {
      getAll: (...) => Effect.gen(function* () { ... }),
      getById: (...) => Effect.gen(function* () { ... }),
      create: (...) => Effect.gen(function* () { ... }),
      update: (...) => Effect.gen(function* () { ... }),
      remove: (...) => Effect.gen(function* () { ... }),
      getStats: () => Effect.gen(function* () { ... }),
    } as const;
  }),
}) {}
```

Key parts:
- `dependencies: [DatabaseLayer]` — declarative dependency on the DB layer
- `effect: Effect.gen(...)` — the implementation (runs when layer is built)
- `yield* SqlClient.SqlClient` — acquires the SQL client from the dependency
- Returns an object of methods — each method returns an Effect
- `as const` — preserves literal types for better inference

**JobImportService** — stateless (no dependencies):

```typescript
// src/lib/services/JobImportService.ts
export class JobImportService extends Effect.Service<JobImportService>()("JobImportService", {
  succeed: {
    importFromUrl: (url: string) => Effect.tryPromise({ ... }),
  },
}) {}
```

Using `succeed` instead of `effect` — when the service doesn't need to acquire
any dependencies. It's a shorthand that wraps the object in `Layer.succeed`.

### How dependencies auto-resolve

```typescript
// AppLive.ts
export const AppLive = Layer.mergeAll(
  ApplicationService.Default,   // ← .Default is auto-generated by Effect.Service
  QAService.Default,
  JobImportService.Default,
  StorageServiceStub,
);
// Effect automatically resolves: ApplicationService needs DatabaseLayer,
// QAService also needs DatabaseLayer → they share the same DB connection pool
```

### Another example

```typescript
// A notification service depending on email + SMS services
class NotificationService extends Effect.Service<NotificationService>()("NotificationService", {
  dependencies: [EmailServiceLive, SmsServiceLive],
  effect: Effect.gen(function* () {
    const email = yield* EmailService;
    const sms = yield* SmsService;

    return {
      notify: (user: User, message: string) =>
        Effect.gen(function* () {
          if (user.prefersSms) {
            yield* sms.send(user.phone, message);
          } else {
            yield* email.send(user.email, "Notification", message);
          }
        }),
    } as const;
  }),
}) {}
```

---

## 10. Context.Tag + Layer.succeed — Classic Service Pattern

### What the pattern says

Before `Effect.Service`, services were defined by:
1. A `Context.Tag` that defines the service interface
2. A `Layer` that provides the concrete implementation

### Why this matters

This pattern is still useful for:
- **Stubs/mocks** — when you don't have a real implementation yet
- **Interface-first design** — define what the service looks like before implementing
- **Multiple implementations** — same Tag, different Layers

### How JobForge uses this

**StorageService** — a stub for Phase 3:

```typescript
// src/lib/services/StorageService.ts
export class StorageService extends Context.Tag("StorageService")<
  StorageService,
  {
    readonly upload: (key: string, data: Uint8Array, contentType: string) => Effect.Effect<string, StorageError>;
    readonly download: (key: string) => Effect.Effect<Uint8Array, StorageError>;
    readonly remove: (key: string) => Effect.Effect<void, StorageError>;
    readonly getUrl: (key: string) => Effect.Effect<string, StorageError>;
  }
>() {}

export const StorageServiceStub = Layer.succeed(StorageService, {
  upload: () => Effect.fail(new StorageError({ message: "Not implemented" })),
  download: () => Effect.fail(new StorageError({ message: "Not implemented" })),
  remove: () => Effect.fail(new StorageError({ message: "Not implemented" })),
  getUrl: () => Effect.fail(new StorageError({ message: "Not implemented" })),
});
```

**Rationale**: The interface is defined now (Phase 2) so other code can depend
on it. The stub implementation fails with `StorageError` — any code that tries
to use storage before Phase 3 gets a clear error. In Phase 3, we'll create
`StorageServiceLive` with MinIO and swap it in `AppLive`.

### When to use which pattern

| Situation | Use |
|-----------|-----|
| Full implementation ready | `Effect.Service` with `effect` |
| Simple stateless service | `Effect.Service` with `succeed` |
| Interface-only (stub/mock) | `Context.Tag` + `Layer.succeed` |
| Multiple implementations | `Context.Tag` + separate Layers |

### Another example

```typescript
// Interface-first: define what a cache looks like
class CacheService extends Context.Tag("CacheService")<
  CacheService,
  {
    readonly get: (key: string) => Effect.Effect<string, CacheNotFoundError>;
    readonly set: (key: string, value: string, ttl?: number) => Effect.Effect<void>;
    readonly del: (key: string) => Effect.Effect<void>;
  }
>() {}

// In-memory implementation (for dev)
const CacheServiceInMemory = Layer.succeed(CacheService, {
  // ... Map-based implementation
});

// Redis implementation (for prod)
const CacheServiceRedis = Layer.effect(CacheService, Effect.gen(function* () {
  const redis = yield* RedisClient;
  return { /* redis-backed implementation */ };
}));

// Swap in AppLive based on environment
```

---

## 11. Layer Composition — Building the Dependency Graph

### What the pattern says

Layers are **recipes for building services**. You compose them together to
create a complete dependency graph that gets provided to your effects at runtime.

### Why this matters

```
Layer<Requirements_out, Error, Requirements_in>
```

Think of a Layer as: "Given `Requirements_in`, I can produce `Requirements_out`
(and might fail with `Error`)."

You compose layers to build a tree:

```
AppLive
├── ApplicationService.Default
│   └── DatabaseLayer
│       └── PgClient (Config: DATABASE_URL)
├── QAService.Default
│   └── DatabaseLayer (shared — same instance)
├── JobImportService.Default
│   └── (no dependencies)
└── StorageServiceStub
    └── (no dependencies)
```

### How JobForge uses this

```typescript
// src/lib/layers/AppLive.ts
export const AppLive = Layer.mergeAll(
  ApplicationService.Default,
  QAService.Default,
  JobImportService.Default,
  StorageServiceStub,
);
```

- `Layer.mergeAll` — combines independent layers (they don't depend on each other)
- `ApplicationService.Default` — auto-generated by `Effect.Service`, includes its
  `dependencies: [DatabaseLayer]`
- Effect resolves the dependency graph: both Application and QA services need
  `DatabaseLayer`, but it's created **once** and shared

### Layer composition operators

| Operator | Use case |
|----------|----------|
| `Layer.mergeAll(A, B, C)` | Independent services, combine into one layer |
| `Layer.provide(target, dependency)` | Wire a dependency into a layer |
| `Layer.provideMerge(target, dependency)` | Wire + keep dependency available |

### Database Layer composition

```typescript
// db/client.ts
export const DatabaseLive = PgClient.layerConfig({
  url: Config.redacted("DATABASE_URL"),
});

export const DatabaseLayer = DatabaseLive.pipe(
  Layer.provide(BunContext.layer)  // BunContext provides Bun runtime things
);
```

`PgClient.layerConfig` creates a Layer that provides `SqlClient.SqlClient`.
We pipe it through `Layer.provide(BunContext.layer)` to satisfy its need for
the Bun platform context.

### Another example

```typescript
// Building a more complex layer graph
const ApiLive = Layer.mergeAll(
  UserService.Default,
  OrderService.Default,
  NotificationService.Default,
).pipe(
  Layer.provideMerge(DatabaseLayer),
  Layer.provideMerge(RedisLayer),
  Layer.provideMerge(EmailLayer),
);

// For tests — swap out real services for mocks
const ApiTest = Layer.mergeAll(
  UserService.Default,
  OrderService.Default,
  NotificationService.Default,
).pipe(
  Layer.provideMerge(DatabaseTestLayer),  // in-memory DB
  Layer.provideMerge(RedisTestLayer),     // in-memory cache
  Layer.provideMerge(EmailMockLayer),     // captured emails
);
```

---

## 12. Effect.tryPromise — Wrapping Async/Promise Code

### What the pattern says

`Effect.tryPromise` bridges Promise-based code into the Effect world. It takes
a function that returns a Promise and wraps it in an Effect, catching any
rejections into the error channel.

### Why this matters

Not all libraries are Effect-native. When you need to call a Promise-based API,
`tryPromise` keeps you in the Effect ecosystem:

```typescript
// ❌ Breaking out of Effect to use Promises
const program = Effect.gen(function* () {
  try {
    const result = await somePromiseApi(); // DON'T DO THIS in Effect.gen
  } catch (e) { ... }
});

// ✅ Wrapping the Promise in an Effect
const program = Effect.gen(function* () {
  const result = yield* Effect.tryPromise({
    try: () => somePromiseApi(),
    catch: (error) => new MyDomainError({ message: String(error) }),
  });
});
```

### How JobForge uses this

**JobImportService** wraps the Claude Agent SDK (Promise-based):

```typescript
// src/lib/services/JobImportService.ts
importFromUrl: (url: string) =>
  Effect.tryPromise({
    try: async () => {
      const { AgentSession } = await import("@anthropic-ai/claude-agent-sdk");
      // ... setup agent with tools and schema
      const session = AgentSession.create({ model: "claude-sonnet-4-20250514" });
      const turn = await session.query(/* ... */);
      // ... parse response
      return result;
    },
    catch: (error) =>
      new JobImportError({
        url,
        message: error instanceof Error ? error.message : String(error),
      }),
  }),
```

**Rationale**: The Agent SDK is entirely Promise-based. `tryPromise` wraps the
entire async operation and converts any thrown error into `JobImportError`.
The Effect type system now tracks this error — callers know that
`importFromUrl` can fail with `JobImportError`.

### Another example

```typescript
// Wrapping a third-party HTTP client
const fetchJson = (url: string) =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    },
    catch: (error) => new HttpError({
      url,
      message: error instanceof Error ? error.message : "Unknown error",
    }),
  });

// Wrapping a file system operation
const readFile = (path: string) =>
  Effect.tryPromise({
    try: () => Bun.file(path).text(),
    catch: (error) => new FileError({
      path,
      message: error instanceof Error ? error.message : "Read failed",
    }),
  });
```

---

## 13. Error Handling: yield\*, mapError, catchTag

### What the pattern says

Effect provides a **graduated toolkit** for error handling:
1. `yield* new Error()` — fail with a typed error (like throw, but type-safe)
2. `Effect.mapError` — transform an error into a different type
3. `Effect.catchTag` — handle a specific error type
4. `Effect.catchAll` — handle any error
5. `Effect.catchTags` — handle multiple specific error types

### How JobForge uses each

#### 1. Yielding errors (creating failures)

```typescript
// src/lib/services/ApplicationService.ts
if (rows.length === 0) {
  return yield* new ApplicationNotFoundError({ id });
}
```

`yield* new Error()` works because `Schema.TaggedError` extends Effect's
yieldable types. When you `yield*` an error inside `Effect.gen`, the effect
**fails** — execution stops and the error propagates through the E channel.

#### 2. mapError (transforming errors)

```typescript
// Converting decode ParseError → SqlError
yield* decodeApplication(row).pipe(
  Effect.mapError(
    () => new SqlError({
      cause: new Error("Failed to decode application row"),
      message: "Decode error",
    }),
  ),
);
```

**Rationale**: `Schema.decodeUnknown` fails with `ParseError`, but callers
of our service shouldn't know about Schema internals. We `mapError` to convert
it into a domain error (SqlError) — this is the "mapping errors to fit your
domain" pattern.

#### 3. catchTag (handling specific errors)

```typescript
// At the API/server function boundary
getApplicationById(id).pipe(
  Effect.catchTag("ApplicationNotFoundError", () =>
    Effect.succeed(null)  // convert 404 to null for React
  ),
)
```

### Error propagation flow

```
DB Query fails → SqlError (from @effect/sql)
                  ↓
Decode fails   → ParseError (from Schema) → mapError → SqlError
                  ↓
Not found      → yield* new ApplicationNotFoundError
                  ↓
Server function catches specific errors and returns plain data to React
```

### Another example

```typescript
// Full error handling example
const processPayment = (orderId: string, amount: number) =>
  Effect.gen(function* () {
    const order = yield* orderService.findById(orderId);
    // ↑ Can fail with OrderNotFoundError

    if (order.status !== "pending") {
      return yield* new OrderAlreadyProcessedError({ orderId });
    }

    const result = yield* paymentGateway.charge(amount).pipe(
      Effect.mapError((e) => new PaymentFailedError({
        orderId,
        reason: e.message,
      }))
    );
    // ↑ Gateway errors transformed to domain error

    return yield* orderService.markPaid(orderId, result.transactionId);
  });

// At the API boundary — handle each error differently
processPayment(orderId, 100).pipe(
  Effect.catchTag("OrderNotFoundError", (e) =>
    Effect.succeed({ status: 404, body: `Order ${e.orderId} not found` })
  ),
  Effect.catchTag("OrderAlreadyProcessedError", (e) =>
    Effect.succeed({ status: 409, body: `Order ${e.orderId} already processed` })
  ),
  Effect.catchTag("PaymentFailedError", (e) =>
    Effect.succeed({ status: 402, body: `Payment failed: ${e.reason}` })
  ),
)
```

---

## 14. Config — Environment Variables the Effect Way

### What the pattern says

Use `Config.string()`, `Config.number()`, `Config.redacted()` to read
environment variables. Never use `process.env` directly.

### Why this matters

```typescript
// ❌ process.env — untyped, easy to misspell, no composition
const dbUrl = process.env.DATABASE_URL; // string | undefined — oops

// ✅ Config — typed, composable, testable
const dbUrl = Config.redacted("DATABASE_URL");
// Returns Effect<Redacted<string>> — fails if not set
```

Benefits:
- **Typed** — Config.number() guarantees a number, not a string
- **Fail-fast** — missing config fails the effect immediately with a clear error
- **Testable** — you can provide a test ConfigProvider
- **Redacted** — sensitive values (passwords, API keys) are redacted in logs

### How JobForge uses this

```typescript
// db/client.ts
export const DatabaseLive = PgClient.layerConfig({
  url: Config.redacted("DATABASE_URL"),
  //   ^^^^^^^^^^^^^^^ redacted because DB URL contains password
});
```

`PgClient.layerConfig` accepts Config values. When the layer is built, Effect
reads `DATABASE_URL` from the environment. If it's missing, the layer
construction fails with a clear error message.

**Note**: Bun automatically loads `.env` files — no `dotenv` needed. But we
still use Effect's Config instead of `process.env` for type safety.

### Another example

```typescript
// Reading multiple config values
const appConfig = Effect.all({
  port: Config.number("PORT").pipe(Config.withDefault(3000)),
  host: Config.string("HOST").pipe(Config.withDefault("localhost")),
  apiKey: Config.redacted("API_KEY"),        // required, redacted
  debug: Config.boolean("DEBUG").pipe(Config.withDefault(false)),
});

// Use in service construction
class ApiServer extends Effect.Service<ApiServer>()("ApiServer", {
  effect: Effect.gen(function* () {
    const config = yield* appConfig;
    return {
      start: () => Effect.log(`Starting on ${config.host}:${config.port}`),
    } as const;
  }),
}) {}
```

---

## 15. pipe — Composing Operations Top-to-Bottom

### What the pattern says

`.pipe()` applies a sequence of transformations in readable, top-to-bottom order.

### Why this matters

```typescript
// ❌ Nested calls — read inside-out (confusing)
const result = Effect.mapError(
  Effect.map(
    Effect.flatMap(fetchUser(id), validateUser),
    formatForApi
  ),
  handleError
);

// ✅ Pipe — read top-to-bottom (natural)
const result = fetchUser(id).pipe(
  Effect.flatMap(validateUser),
  Effect.map(formatForApi),
  Effect.mapError(handleError),
);
```

### How JobForge uses this

Pipe is used extensively for composing operations:

```typescript
// Schema decode + error mapping
yield* decodeApplication(row).pipe(
  Effect.mapError(() => new SqlError({ ... })),
);

// Layer composition
export const DatabaseLayer = DatabaseLive.pipe(
  Layer.provide(BunContext.layer),
);

// Running effects with provided layers
Effect.runPromise(
  service.getById(id).pipe(Effect.provide(AppLive))
);
```

### Another example

```typescript
// Complex pipeline
const processOrder = (orderId: string) =>
  findOrder(orderId).pipe(
    Effect.flatMap(validateOrder),           // validate
    Effect.flatMap(calculateTotal),          // compute
    Effect.tap((order) =>                    // side-effect (logging)
      Effect.log(`Processing order ${order.id}: $${order.total}`)
    ),
    Effect.flatMap(chargePayment),           // charge
    Effect.flatMap(sendConfirmation),        // notify
    Effect.mapError(toApiError),             // transform any error
    Effect.timeout(Duration.seconds(30)),    // add timeout
    Effect.retry(Schedule.exponential("100 millis").pipe(
      Schedule.compose(Schedule.recurs(3))   // retry 3x
    )),
  );
```

---

## 16. SQL Integration with @effect/sql-pg

### What the pattern says

Use tagged template literals for all SQL. No ORM, no query builder.
Decode results with Effect Schema at the repository boundary.

### Why this matters

- **SQL injection safety** — tagged templates auto-parameterize values
- **Clarity** — you see the exact SQL being executed
- **No abstraction tax** — no ORM magic, no N+1 surprise, full PostgreSQL power

### How JobForge uses this

#### Basic CRUD

```typescript
// INSERT with RETURNING
const rows = yield* sql`
  INSERT INTO applications (company, role, url, status, ...)
  VALUES (${data.company}, ${data.role}, ${data.url}, ${data.status}, ...)
  RETURNING *
`;

// SELECT with parameter binding
const rows = yield* sql`SELECT * FROM applications WHERE id = ${id}`;

// DELETE
yield* sql`DELETE FROM applications WHERE id = ${id}`;
```

#### Safe dynamic sorting (whitelist pattern)

```typescript
const SORT_FIELDS: Record<string, string> = {
  company: "company",
  role: "role",
  status: "status",
  applied_at: "applied_at",
  created_at: "created_at",
  updated_at: "updated_at",
};

const safeField = SORT_FIELDS[sort?.field ?? "created_at"] ?? "created_at";
const safeDir = sort?.direction === "asc" ? "ASC" : "DESC";

// sql.unsafe() is safe here because values are from our whitelist, not user input
const rows = yield* sql`
  SELECT * FROM applications
  ORDER BY ${sql.unsafe(safeField)} ${sql.unsafe(safeDir)}
  LIMIT ${pageSize} OFFSET ${offset}
`;
```

**Rationale**: `sql.unsafe()` bypasses parameterization — needed for column names
and sort directions (which can't be parameterized in SQL). The whitelist ensures
only known-safe values reach `sql.unsafe()`.

#### Dynamic partial updates

```typescript
// sql.update() generates SET clauses from an object
const updates: Record<string, unknown> = {};
if (data.company !== undefined) updates.company = data.company;
if (data.role !== undefined) updates.role = data.role;
// ...

const rows = yield* sql`
  UPDATE applications
  SET ${sql.update(updates)}, updated_at = now()
  WHERE id = ${id}
  RETURNING *
`;
```

#### PostgreSQL arrays

```typescript
// Insert with array
VALUES (..., ${data.tags}::text[])

// Query with array overlap
WHERE tags && ${tagFilter}::text[]

// Aggregate distinct tags
SELECT DISTINCT unnest(tags) as tag FROM qa_entries ORDER BY tag
```

#### Full-text search

```typescript
// FTS with rank ordering
WHERE search_vector @@ websearch_to_tsquery('english', ${queryFilter})
ORDER BY ts_rank(search_vector, websearch_to_tsquery('english', ${queryFilter})) DESC
```

---

## 17. Effect Boundary — Where Effect Stops and React Begins

### What the pattern says

Effect TS lives **only** in `src/lib/` and `src/server/`. React components
never import from `effect`. Server functions are the bridge.

### Why this matters

```
React Component (client)
    ↓ calls
Server Function (src/server/functions/)
    ↓ runs
Effect Program (src/lib/services/)
    ↓ returns plain data
Server Function
    ↓ returns
React Component (receives plain JSON)
```

- React components stay simple — just UI
- Effect programs stay pure — just logic
- Server functions are the thin bridge — `Effect.runPromise(effect.pipe(Effect.provide(AppLive)))`

### How JobForge implements this

```typescript
// Server function pattern
import { createServerFn } from "@tanstack/react-start";

export const getApplications = createServerFn({ method: "GET" })
  .handler(async () => {
    const service = yield* ApplicationService;
    const result = service.getAll();
    return Effect.runPromise(result.pipe(Effect.provide(AppLive)));
    // ↑ Effect world ends here — returns plain data to React
  });
```

### Dual validation

| Layer | Tool | Why |
|-------|------|-----|
| Client (React forms) | **Zod** | TanStack Form integration, immediate UX feedback |
| Server (Effect services) | **Effect Schema** | Type-safe, composable, integrated with Effect |

```typescript
// Client: Zod validates form input
import { applicationFormSchema } from "~/lib/schemas/forms"; // Zod
// ↓ form data crosses network boundary
// Server: Effect Schema validates and decodes
const decoded = yield* Schema.decodeUnknown(CreateApplication)(data);
```

---

## 18. Testing with Effect

### What the pattern says

Test Effects by:
1. Running them with `Effect.runPromise` in test cases
2. Providing test layers instead of live layers
3. Using `Layer.succeed` for mocks

### How this applies to JobForge

```typescript
// Test pattern
import { describe, it, expect } from "bun:test";

describe("ApplicationService", () => {
  // Create a test layer with in-memory database
  const TestLayer = Layer.mergeAll(
    ApplicationService.Default,
  ).pipe(
    Layer.provide(DatabaseTestLayer), // test DB
  );

  it("creates an application", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ApplicationService;
        return yield* service.create({
          company: "Test Corp",
          role: "Developer",
        });
      }).pipe(Effect.provide(TestLayer))
    );

    expect(result.company).toBe("Test Corp");
    expect(result.status).toBe("draft"); // default
  });

  it("fails when application not found", async () => {
    const result = Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ApplicationService;
        return yield* service.getById("nonexistent");
      }).pipe(Effect.provide(TestLayer))
    );

    await expect(result).rejects.toThrow();
  });
});
```

### Testing with mocked services

```typescript
// Mock the storage service for testing
const StorageTestLayer = Layer.succeed(StorageService, {
  upload: (key, data, contentType) =>
    Effect.succeed(`https://test-bucket/${key}`),
  download: (key) =>
    Effect.succeed(new Uint8Array([1, 2, 3])),
  remove: (key) => Effect.void,
  getUrl: (key) =>
    Effect.succeed(`https://test-bucket/${key}`),
});

// Use in tests instead of StorageServiceStub
const TestAppLive = Layer.mergeAll(
  ApplicationService.Default,
  QAService.Default,
  JobImportService.Default,
  StorageTestLayer,  // ← mock instead of stub
);
```

---

## 19. Anti-Patterns to Avoid

### 1. Never use try/catch inside Effect code

```typescript
// ❌ BAD — breaks the Effect error channel
const getUser = Effect.gen(function* () {
  try {
    const rows = yield* sql`SELECT * FROM users WHERE id = ${id}`;
    return rows[0];
  } catch (e) {
    return null; // error is swallowed, E channel doesn't know
  }
});

// ✅ GOOD — use Effect error handling
const getUser = Effect.gen(function* () {
  const rows = yield* sql`SELECT * FROM users WHERE id = ${id}`;
  if (rows.length === 0) {
    return yield* new UserNotFoundError({ id }); // typed error
  }
  return rows[0];
});
```

### 2. Never call runPromise inside an Effect

```typescript
// ❌ BAD — breaks composition, loses error tracking
const program = Effect.gen(function* () {
  const user = await Effect.runPromise(getUser(id)); // NO!
  return user;
});

// ✅ GOOD — stay in Effect world
const program = Effect.gen(function* () {
  const user = yield* getUser(id); // compose naturally
  return user;
});
```

### 3. Never use process.env directly

```typescript
// ❌ BAD — untyped, untestable
const apiKey = process.env.API_KEY;

// ✅ GOOD — typed, testable, fails clearly
const apiKey = Config.redacted("API_KEY");
```

### 4. Never use generic Error class

```typescript
// ❌ BAD — untyped, no discrimination
throw new Error("User not found");

// ✅ GOOD — typed, discriminated
return yield* new UserNotFoundError({ id });
```

### 5. Never trust external data without decoding

```typescript
// ❌ BAD — trusting DB data
const app = rows[0] as Application;

// ✅ GOOD — validate at boundary
const app = yield* decodeApplication(rows[0]);
```

### 6. Never use Effect in React components

```typescript
// ❌ BAD — Effect in component
function UserProfile({ id }: { id: string }) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    Effect.runPromise(getUser(id)).then(setUser); // NO!
  }, [id]);
}

// ✅ GOOD — server function bridge
const getUser = createServerFn({ method: "GET" })
  .handler(async ({ id }) => {
    return Effect.runPromise(userService.findById(id).pipe(Effect.provide(AppLive)));
  });

function UserProfile({ id }: { id: string }) {
  const { data: user } = useQuery({ queryFn: () => getUser({ id }) });
}
```

---

## 20. Pattern Comparison Summary

| Pattern | JobForge Implementation | Matches Effect Patterns? | Notes |
|---------|------------------------|-------------------------|-------|
| Effects are lazy | All service methods return Effects, run at boundary | ✅ Correct | `Effect.runPromise` only in server functions |
| Three channels `<A, E, R>` | Types inferred from generators | ✅ Correct | Never manually annotated — compiler infers |
| Effect.gen with yield* | All service methods + construction | ✅ Correct | Preferred over flatMap chains |
| Schema.Class | Application, QAEntry, Create/Update variants | ✅ Correct | Three-variant pattern (Full/Create/Update) |
| Schema.TaggedError | All errors with unique _tag + context fields | ✅ Correct | Organized by domain module |
| Schema.transform | DateToString for pg Date→ISO string | ✅ Correct | Single shared transform |
| Schema.decodeUnknown | At every DB read boundary | ✅ Correct | Always with mapError to domain errors |
| Effect.Service | ApplicationService, QAService, JobImportService | ✅ Correct | Modern pattern with dependencies |
| Context.Tag + Layer | StorageService (stub) | ✅ Correct | Classic pattern for interface-first |
| Layer.mergeAll | AppLive composition | ✅ Correct | Single composition point |
| Effect.tryPromise | JobImportService (Agent SDK) | ✅ Correct | Proper catch → domain error |
| Error yielding | `yield* new Error()` | ✅ Correct | Yieldable tagged errors |
| mapError | Decode errors → SqlError | ✅ Correct | Domain error boundaries |
| Config.redacted | DATABASE_URL | ✅ Correct | Never process.env |
| SQL tagged templates | All queries | ✅ Correct | No ORM, parameterized |
| Effect boundary | src/lib/ only, server functions bridge | ✅ Correct | React never imports effect |
| Zod for forms | TanStack Form validation | ✅ Correct | Dual validation strategy |

### Verdict

**All patterns in JobForge match the recommended Effect TS patterns.**
The codebase demonstrates a clean, idiomatic Effect architecture with proper
separation of concerns, type-safe error handling, and composable layers.

---

## Further Reading

| Topic | Location |
|-------|----------|
| Core concepts | `docs/effect-patterns/content/published/patterns/core-concepts/` |
| Error management | `docs/effect-patterns/content/published/patterns/error-management/` |
| Schema patterns | `docs/effect-patterns/content/published/patterns/schema/` |
| Domain modeling | `docs/effect-patterns/content/published/patterns/domain-modeling/` |
| Resource management | `docs/effect-patterns/content/published/patterns/resource-management/` |
| Testing | `docs/effect-patterns/content/published/patterns/testing/` |
| Concurrency | `docs/effect-patterns/content/published/patterns/concurrency/` |
| Streams | `docs/effect-patterns/content/published/patterns/streams/` |
| Effect official docs | [effect.website](https://effect.website) |
