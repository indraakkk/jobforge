import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";
import { AppLive } from "~/lib/layers/AppLive";
import { CreateQAEntry, type QASearchFilters, UpdateQAEntry } from "~/lib/schemas/qa";
import { QAService } from "~/lib/services/QAService";

export const getQAEntries = createServerFn({ method: "GET" })
  .inputValidator((input: { filters?: QASearchFilters; page?: number; pageSize?: number }) => input)
  .handler(async ({ data }) => {
    return Effect.runPromise(
      QAService.pipe(
        Effect.flatMap((svc) => svc.search(data.filters, data.page, data.pageSize)),
        Effect.map((result) => ({
          items: result.items.map((entry) => ({ ...entry })),
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
        })),
        Effect.provide(AppLive),
      ),
    );
  });

export const getQAEntry = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    return Effect.runPromise(
      QAService.pipe(
        Effect.flatMap((svc) => svc.findById(data.id)),
        Effect.map((entry) => ({ ...entry })),
        Effect.provide(AppLive),
      ),
    );
  });

export const getQAEntriesByApplication = createServerFn({ method: "GET" })
  .inputValidator((input: { applicationId: string }) => input)
  .handler(async ({ data }) => {
    return Effect.runPromise(
      QAService.pipe(
        Effect.flatMap((svc) => svc.findByApplication(data.applicationId)),
        Effect.map((entries) => entries.map((entry) => ({ ...entry }))),
        Effect.provide(AppLive),
      ),
    );
  });

export const createQAEntry = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Schema.decodeUnknownSync(CreateQAEntry)(input))
  .handler(async ({ data }) => {
    return Effect.runPromise(
      QAService.pipe(
        Effect.flatMap((svc) => svc.create(data)),
        Effect.map((entry) => ({ ...entry })),
        Effect.provide(AppLive),
      ),
    );
  });

export const updateQAEntry = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const { id, ...rest } = input as { id: string; [k: string]: unknown };
    return { id, ...Schema.decodeUnknownSync(UpdateQAEntry)(rest) };
  })
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    return Effect.runPromise(
      QAService.pipe(
        Effect.flatMap((svc) => svc.update(id, rest)),
        Effect.map((entry) => ({ ...entry })),
        Effect.provide(AppLive),
      ),
    );
  });

export const deleteQAEntry = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    return Effect.runPromise(
      QAService.pipe(
        Effect.flatMap((svc) => svc.remove(data.id)),
        Effect.provide(AppLive),
      ),
    );
  });

export const getQATags = createServerFn({ method: "GET" }).handler(async () => {
  return Effect.runPromise(
    QAService.pipe(
      Effect.flatMap((svc) => svc.listTags()),
      Effect.map((tags) => [...tags]),
      Effect.provide(AppLive),
    ),
  );
});
