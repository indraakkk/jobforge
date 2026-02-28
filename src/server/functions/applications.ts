import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";
import { AppLive } from "~/lib/layers/AppLive";
import {
  type ApplicationFilters,
  type ApplicationSort,
  CreateApplication,
  UpdateApplication,
} from "~/lib/schemas/application";
import { ApplicationService } from "~/lib/services/ApplicationService";

export const getApplications = createServerFn({ method: "GET" })
  .inputValidator(
    (input: {
      filters?: ApplicationFilters;
      sort?: ApplicationSort;
      page?: number;
      pageSize?: number;
    }) => input,
  )
  .handler(async ({ data }) => {
    return Effect.runPromise(
      ApplicationService.pipe(
        Effect.flatMap((svc) => svc.getAll(data.filters, data.sort, data.page, data.pageSize)),
        Effect.map((result) => ({
          items: result.items.map((app) => ({ ...app })),
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
        })),
        Effect.provide(AppLive),
      ),
    );
  });

export const getApplication = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    return Effect.runPromise(
      ApplicationService.pipe(
        Effect.flatMap((svc) => svc.getById(data.id)),
        Effect.map((app) => ({ ...app })),
        Effect.provide(AppLive),
      ),
    );
  });

export const createApplication = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Schema.decodeUnknownSync(CreateApplication)(input))
  .handler(async ({ data }) => {
    return Effect.runPromise(
      ApplicationService.pipe(
        Effect.flatMap((svc) => svc.create(data)),
        Effect.map((app) => ({ ...app })),
        Effect.provide(AppLive),
      ),
    );
  });

export const updateApplication = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const { id, ...rest } = input as { id: string; [k: string]: unknown };
    return { id, ...Schema.decodeUnknownSync(UpdateApplication)(rest) };
  })
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    return Effect.runPromise(
      ApplicationService.pipe(
        Effect.flatMap((svc) => svc.update(id, rest)),
        Effect.map((app) => ({ ...app })),
        Effect.provide(AppLive),
      ),
    );
  });

export const deleteApplication = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    return Effect.runPromise(
      ApplicationService.pipe(
        Effect.flatMap((svc) => svc.remove(data.id)),
        Effect.provide(AppLive),
      ),
    );
  });

export const getApplicationStats = createServerFn({ method: "GET" }).handler(async () => {
  return Effect.runPromise(
    ApplicationService.pipe(
      Effect.flatMap((svc) => svc.getStats()),
      Effect.provide(AppLive),
    ),
  );
});
