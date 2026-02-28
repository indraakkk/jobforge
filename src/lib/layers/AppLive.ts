import { BunContext } from "@effect/platform-bun";
import { DatabaseLive } from "db/client";
import { Layer } from "effect";
import { ApplicationServiceLive } from "../services/ApplicationService";
import { StorageServiceStub } from "../services/StorageService";

export const AppLive = ApplicationServiceLive.pipe(
  Layer.provideMerge(StorageServiceStub),
  Layer.provideMerge(DatabaseLive),
  Layer.provideMerge(BunContext.layer),
);
