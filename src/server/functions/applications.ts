import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";
import { AppLive } from "~/lib/layers/AppLive";
import type { ApplicationFilters, ApplicationSort } from "~/lib/schemas/application";
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
  .inputValidator(
    (input: {
      company: string;
      role: string;
      url?: string | null;
      status?: string;
      job_description?: string | null;
      salary_range?: string | null;
      location?: string | null;
      platform?: string | null;
      contact_name?: string | null;
      contact_email?: string | null;
      notes?: string | null;
      applied_at?: string | null;
      next_action?: string | null;
      next_action_date?: string | null;
    }) => input,
  )
  .handler(async ({ data }) => {
    return Effect.runPromise(
      ApplicationService.pipe(
        Effect.flatMap((svc) => svc.create(data as any)),
        Effect.map((app) => ({ ...app })),
        Effect.provide(AppLive),
      ),
    );
  });

export const updateApplication = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id: string;
      company?: string;
      role?: string;
      url?: string | null;
      status?: string;
      job_description?: string | null;
      salary_range?: string | null;
      location?: string | null;
      platform?: string | null;
      contact_name?: string | null;
      contact_email?: string | null;
      notes?: string | null;
      applied_at?: string | null;
      next_action?: string | null;
      next_action_date?: string | null;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    return Effect.runPromise(
      ApplicationService.pipe(
        Effect.flatMap((svc) => svc.update(id, rest as any)),
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
