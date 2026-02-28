import { Context, Effect, Layer } from "effect";
import { StorageError } from "../errors";

export class StorageService extends Context.Tag("StorageService")<
  StorageService,
  {
    readonly upload: (
      key: string,
      data: Uint8Array,
      contentType: string,
    ) => Effect.Effect<string, StorageError>;
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
