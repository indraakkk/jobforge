import { BunContext } from "@effect/platform-bun";
import { DatabaseLive } from "db/client";
import { Layer } from "effect";
import { ApplicationServiceLive } from "~/lib/services/ApplicationService";
import { StorageServiceStub } from "~/lib/services/StorageService";

export const AppLive = ApplicationServiceLive.pipe(
  Layer.provideMerge(StorageServiceStub), // TODO: replace with StorageServiceLive in Phase 3
  Layer.provideMerge(DatabaseLive),
  Layer.provideMerge(BunContext.layer),
);
