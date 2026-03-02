import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";
import { AppLive } from "~/lib/layers/AppLive";
import { JobImportService } from "~/lib/services/JobImportService";

export const importJobFromUrl = createServerFn({ method: "POST" })
  .inputValidator((input: { url: string }) => input)
  .handler(async ({ data }) => {
    return Effect.runPromise(
      JobImportService.pipe(
        Effect.flatMap((svc) => svc.importFromUrl(data.url)),
        Effect.provide(AppLive),
      ),
    );
  });
