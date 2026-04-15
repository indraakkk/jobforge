import { Config, Context, Duration, Effect, Layer, Schema } from "effect";
import {
  ClaudeExitError,
  ClaudeParseError,
  ClaudeSpawnError,
  ClaudeTimeoutError,
} from "~/lib/errors/claude";
import { ClaudeResponse } from "~/lib/schemas/claude";

export interface AskOptions {
  readonly model?: string;
  readonly systemPrompt?: string;
  readonly allowedTools?: ReadonlyArray<string>;
  readonly tools?: string;
  readonly timeout?: number;
  readonly maxBudgetUsd?: number;
  readonly dangerouslySkipPermissions?: boolean;
  readonly noSessionPersistence?: boolean;
  readonly additionalArgs?: ReadonlyArray<string>;
}

type ClaudeError = ClaudeSpawnError | ClaudeExitError | ClaudeParseError | ClaudeTimeoutError;

export class ClaudeCliService extends Context.Tag("ClaudeCliService")<
  ClaudeCliService,
  {
    readonly ask: (
      prompt: string,
      options?: AskOptions,
    ) => Effect.Effect<ClaudeResponse, ClaudeError>;
    readonly askText: (prompt: string, options?: AskOptions) => Effect.Effect<string, ClaudeError>;
  }
>() {}

const decodeResponse = Schema.decodeUnknown(ClaudeResponse);

export const ClaudeCliLayer = Layer.effect(
  ClaudeCliService,
  Effect.gen(function* () {
    const proxyUrl = yield* Config.string("CLAUDE_PROXY_URL").pipe(
      Config.withDefault("http://localhost:3001"),
    );
    const defaultTimeoutMs = yield* Config.number("CLAUDE_TIMEOUT_MS").pipe(
      Config.withDefault(300_000),
    );

    const runClaude = (
      prompt: string,
      opts?: AskOptions,
    ): Effect.Effect<ClaudeResponse, ClaudeError> => {
      const timeoutMs = opts?.timeout ?? defaultTimeoutMs;

      return Effect.tryPromise({
        try: async () => {
          const res = await fetch(`${proxyUrl}/ask`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, options: opts }),
          });
          const body = (await res.json()) as { ok: boolean; stdout: string; error: string };
          if (!body.ok) {
            throw new Error(body.error ?? `Proxy error ${res.status}`);
          }
          return body.stdout;
        },
        catch: (e) =>
          new ClaudeSpawnError({
            message: `Claude proxy error: ${e instanceof Error ? e.message : String(e)}`,
            cause: e,
          }),
      }).pipe(
        Effect.flatMap((stdout) =>
          Effect.try({
            try: () => JSON.parse(stdout) as unknown,
            catch: (e) =>
              new ClaudeParseError({
                message: "Failed to parse claude CLI output as JSON",
                rawOutput: stdout.slice(0, 500),
                cause: e,
              }),
          }),
        ),
        Effect.flatMap((parsed) =>
          decodeResponse(parsed).pipe(
            Effect.mapError(
              (decodeError) =>
                new ClaudeParseError({
                  message: `Claude CLI response didn't match expected schema: ${String(decodeError)}`,
                  rawOutput: JSON.stringify(parsed).slice(0, 500),
                  cause: decodeError,
                }),
            ),
          ),
        ),
        Effect.flatMap((response) =>
          response.is_error
            ? Effect.fail(new ClaudeExitError({ message: response.result }))
            : Effect.succeed(response),
        ),
        Effect.timeout(Duration.millis(timeoutMs)),
        Effect.catchTag("TimeoutException", () =>
          Effect.fail(
            new ClaudeTimeoutError({
              message: `Claude CLI timed out after ${timeoutMs}ms`,
              timeoutMs,
            }),
          ),
        ),
      );
    };

    return {
      ask: (prompt, options) => runClaude(prompt, options),
      askText: (prompt, options) => runClaude(prompt, options).pipe(Effect.map((r) => r.result)),
    };
  }),
);
