import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";
import { AppLive } from "~/lib/layers/AppLive";
import type { CVFile } from "~/lib/schemas/cv";
import { CVService } from "~/lib/services/CVService";

function serializeCVFile(cv: CVFile & { variant_count?: number }) {
  return {
    id: cv.id,
    name: cv.name,
    file_key: cv.file_key,
    file_type: cv.file_type,
    file_size: cv.file_size,
    extracted_text: cv.extracted_text,
    is_base: cv.is_base,
    parent_id: cv.parent_id,
    version: cv.version,
    // biome-ignore lint/complexity/noBannedTypes: {} means any non-null JSON value, correct for jsonb metadata
    metadata: cv.metadata as Record<string, {}>,
    created_at: cv.created_at,
    updated_at: cv.updated_at,
    variant_count: cv.variant_count ?? 0,
  };
}

export type SerializedCVFile = ReturnType<typeof serializeCVFile>;

export const uploadCV = createServerFn({ method: "POST" })
  .inputValidator((input: FormData) => input)
  .handler(async ({ data: formData }) => {
    const file = formData.get("file");
    const name = formData.get("name");
    if (!file || !(file instanceof File) || !name || typeof name !== "string") {
      throw new Error("Missing required fields: file and name");
    }
    const parentId = (formData.get("parent_id") as string) || null;

    const fileData = new Uint8Array(await file.arrayBuffer());

    return Effect.runPromise(
      CVService.pipe(
        Effect.flatMap((svc) =>
          parentId
            ? svc.uploadVariant(fileData, name, file.type, parentId)
            : svc.uploadBase(fileData, name, file.type),
        ),
        Effect.map(serializeCVFile),
        Effect.provide(AppLive),
      ),
    );
  });

export const getCVFiles = createServerFn({ method: "GET" })
  .inputValidator((input: { parentId?: string }) => input)
  .handler(async ({ data }) => {
    return Effect.runPromise(
      CVService.pipe(
        Effect.flatMap((svc) => (data.parentId ? svc.findVariants(data.parentId) : svc.findBase())),
        Effect.map((items) => items.map(serializeCVFile)),
        Effect.provide(AppLive),
      ),
    );
  });

export const getCVFile = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    return Effect.runPromise(
      CVService.pipe(
        Effect.flatMap((svc) => svc.findById(data.id)),
        Effect.map(serializeCVFile),
        Effect.provide(AppLive),
      ),
    );
  });

export const getCVDownloadUrl = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    return Effect.runPromise(
      CVService.pipe(
        Effect.flatMap((svc) => svc.getDownloadUrl(data.id)),
        Effect.map((url) => ({ url })),
        Effect.provide(AppLive),
      ),
    );
  });

export const deleteCV = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    return Effect.runPromise(
      CVService.pipe(
        Effect.flatMap((svc) => svc.remove(data.id)),
        Effect.provide(AppLive),
      ),
    );
  });

export const linkCVToApplication = createServerFn({ method: "POST" })
  .inputValidator((input: { cvId: string; applicationId: string }) => input)
  .handler(async ({ data }) => {
    return Effect.runPromise(
      CVService.pipe(
        Effect.flatMap((svc) => svc.linkToApplication(data.cvId, data.applicationId)),
        Effect.provide(AppLive),
      ),
    );
  });

export const unlinkCVFromApplication = createServerFn({ method: "POST" })
  .inputValidator((input: { cvId: string; applicationId: string }) => input)
  .handler(async ({ data }) => {
    return Effect.runPromise(
      CVService.pipe(
        Effect.flatMap((svc) => svc.unlinkFromApplication(data.cvId, data.applicationId)),
        Effect.provide(AppLive),
      ),
    );
  });

export const getCVsByApplication = createServerFn({ method: "GET" })
  .inputValidator((input: { applicationId: string }) => input)
  .handler(async ({ data }) => {
    return Effect.runPromise(
      CVService.pipe(
        Effect.flatMap((svc) => svc.findByApplication(data.applicationId)),
        Effect.map((items) => items.map(serializeCVFile)),
        Effect.provide(AppLive),
      ),
    );
  });

export const getApplicationsByCV = createServerFn({ method: "GET" })
  .inputValidator((input: { cvId: string }) => input)
  .handler(async ({ data }) => {
    return Effect.runPromise(
      CVService.pipe(
        Effect.flatMap((svc) => svc.findApplicationsByCV(data.cvId)),
        Effect.provide(AppLive),
      ),
    );
  });

export const uploadAndLinkCV = createServerFn({ method: "POST" })
  .inputValidator((input: FormData) => input)
  .handler(async ({ data: formData }) => {
    const file = formData.get("file");
    const name = formData.get("name");
    const applicationId = formData.get("applicationId");
    if (!file || !(file instanceof File) || !name || typeof name !== "string") {
      throw new Error("Missing required fields: file and name");
    }
    if (!applicationId || typeof applicationId !== "string") {
      throw new Error("Missing required field: applicationId");
    }

    const fileData = new Uint8Array(await file.arrayBuffer());

    return Effect.runPromise(
      CVService.pipe(
        Effect.flatMap((svc) =>
          Effect.gen(function* () {
            const cv = yield* svc.uploadBase(fileData, name, file.type);
            yield* svc.linkToApplication(cv.id, applicationId);
            return cv;
          }),
        ),
        Effect.map(serializeCVFile),
        Effect.provide(AppLive),
      ),
    );
  });
