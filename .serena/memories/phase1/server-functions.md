# Phase 1 — Server Functions (src/server/functions/applications.ts)

All use `createServerFn` from TanStack Start. Each provides `AppLive` layer and runs Effect via `Effect.runPromise`.

## Functions
- `getApplications` — GET, input: `{ status?, search?, sort?, direction?, page?, pageSize? }`, returns paginated list
- `getApplication` — GET, input: `{ id: string }`, returns single application
- `createApplication` — POST, input: CreateApplication fields, returns created application
- `updateApplication` — POST, input: `{ id, ...UpdateApplication fields }`, returns updated application
- `deleteApplication` — POST, input: `{ id: string }`, returns `{ success: true }`
- `getApplicationStats` — GET, no input, returns stats with totals by status

## Pattern
```
createServerFn({ method: "GET"|"POST" })
  .validator(schema)
  .handler(async ({ data }) => {
    const program = ApplicationService.pipe(Effect.flatMap(svc => svc.method(data)))
    return Effect.runPromise(program.pipe(Effect.provide(AppLive)))
  })
```
