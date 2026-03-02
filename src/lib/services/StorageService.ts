import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Config, Context, Effect, Layer } from "effect";
import { StorageError } from "~/lib/errors";

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

const BUCKET = "cv-files";

export const StorageServiceLive = Layer.effect(
  StorageService,
  Effect.gen(function* () {
    const host = yield* Config.string("MINIO_ENDPOINT");
    const port = yield* Config.string("MINIO_PORT");
    const useSsl = yield* Config.string("MINIO_USE_SSL").pipe(Config.withDefault("false"));
    const accessKey = yield* Config.string("MINIO_ACCESS_KEY");
    const secretKey = yield* Config.string("MINIO_SECRET_KEY");
    const protocol = useSsl === "true" ? "https" : "http";
    const endpoint = `${protocol}://${host}:${port}`;

    const client = new S3Client({
      endpoint,
      region: "us-east-1",
      forcePathStyle: true,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
    });

    return {
      upload: (key: string, data: Uint8Array, contentType: string) =>
        Effect.tryPromise({
          try: async () => {
            await client.send(
              new PutObjectCommand({
                Bucket: BUCKET,
                Key: key,
                Body: data,
                ContentType: contentType,
              }),
            );
            return key;
          },
          catch: (error: unknown) =>
            new StorageError({ message: `Upload failed: ${error}`, cause: error }),
        }),

      download: (key: string) =>
        Effect.tryPromise({
          try: async () => {
            const response = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
            if (!response.Body) {
              throw new Error("Empty response body");
            }
            const bytes = await response.Body.transformToByteArray();
            return new Uint8Array(bytes);
          },
          catch: (error: unknown) =>
            new StorageError({ message: `Download failed: ${error}`, cause: error }),
        }),

      remove: (key: string) =>
        Effect.tryPromise({
          try: async () => {
            await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
          },
          catch: (error: unknown) =>
            new StorageError({ message: `Delete failed: ${error}`, cause: error }),
        }),

      getUrl: (key: string) =>
        Effect.tryPromise({
          try: () =>
            getSignedUrl(client, new GetObjectCommand({ Bucket: BUCKET, Key: key }), {
              expiresIn: 3600,
            }),
          catch: (error: unknown) =>
            new StorageError({ message: `Presigned URL failed: ${error}`, cause: error }),
        }),
    };
  }),
);
