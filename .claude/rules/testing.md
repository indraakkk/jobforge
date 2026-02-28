---
paths:
  - "**/*.test.ts"
  - "**/*.spec.ts"
---

# Testing Rules

These rules auto-activate when editing test files.

## Test Runner
- Use `bun:test` — never Jest, Vitest, or Mocha
- Import: `import { describe, it, expect } from "bun:test"`

## Test Structure
```typescript
import { describe, it, expect } from "bun:test"

describe("ModuleName", () => {
  describe("functionName", () => {
    it("should [expected behavior]", () => {
      // Arrange
      // Act
      // Assert
    })
  })
})
```

## Testing Effect Code
```typescript
import { Effect, Layer } from "effect"

// Run Effect in test
it("should return user by id", async () => {
  const result = await Effect.gen(function* () {
    const service = yield* UserService
    return yield* service.findById("user-1")
  }).pipe(
    Effect.provide(TestUserServiceLive),
    Effect.runPromise
  )

  expect(result.name).toBe("Test User")
})

// Test error cases with catchTag
it("should fail with NotFoundError", async () => {
  const result = await Effect.gen(function* () {
    const service = yield* UserService
    return yield* service.findById("nonexistent")
  }).pipe(
    Effect.provide(TestUserServiceLive),
    Effect.catchTag("NotFoundError", (e) => Effect.succeed(e)),
    Effect.runPromise
  )

  expect(result._tag).toBe("NotFoundError")
})
```

## Test Layers
- Create test-specific Layer implementations for services
- Use `Layer.succeed` with mock data for unit tests
- Use real database Layer for integration tests
- Test layers live alongside test files or in `test/layers/`

## Naming
- Test files: `[module].test.ts` next to the source file
- Integration tests: `test/integration/[feature].test.ts`
