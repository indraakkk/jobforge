import { Config, Context, Duration, Effect, Layer, Schema } from "effect";
import {
  ClaudeExitError,
  ClaudeParseError,
  ClaudeSpawnError,
  ClaudeTimeoutError,
} from "~/lib/errors/claude";
import { ClaudeResponse } from "~/lib/schemas/claude";
import {
  type AskOptions,
  armLifecycle,
  buildArgs,
  CLAUDE_BIN,
} from "~/lib/services/claudeCli/spawn";

export type { AskOptions } from "~/lib/services/claudeCli/spawn";

type ClaudeError = ClaudeSpawnError | ClaudeExitError | ClaudeParseError | ClaudeTimeoutError;

export class ClaudeCliService extends Context.Tag("ClaudeCliService")<
  ClaudeCliService,
  {
    readonly ask: (
      prompt: string,
      options?: AskOptions & { timeout?: number },
    ) => Effect.Effect<ClaudeResponse, ClaudeError>;
    readonly askText: (
      prompt: string,
      options?: AskOptions & { timeout?: number },
    ) => Effect.Effect<string, ClaudeError>;
  }
>() {}

const decodeResponse = Schema.decodeUnknown(ClaudeResponse);

export const ClaudeCliLayer = Layer.effect(
  ClaudeCliService,
  Effect.gen(function* () {
    const defaultTimeoutMs = yield* Config.number("CLAUDE_TIMEOUT_MS").pipe(
      Config.withDefault(300_000),
    );

    const runClaude = (
      prompt: string,
      opts?: AskOptions & { timeout?: number },
    ): Effect.Effect<ClaudeResponse, ClaudeError> => {
      const timeoutMs = opts?.timeout ?? defaultTimeoutMs;

      return Effect.tryPromise({
        try: async () => {
          const proc = Bun.spawn([CLAUDE_BIN, ...buildArgs(prompt, opts ?? {}, "json")], {
            stdout: "pipe",
            stderr: "pipe",
          });
          const cancelLifecycle = armLifecycle(proc);
          try {
            const [stdout, stderr] = await Promise.all([
              new Response(proc.stdout).text(),
              new Response(proc.stderr).text(),
            ]);
            const exitCode = await proc.exited;
            if (exitCode !== 0 && !stdout.trim()) {
              throw new Error(stderr.slice(0, 500) || `claude exited with code ${exitCode}`);
            }
            return stdout;
          } finally {
            cancelLifecycle();
          }
        },
        catch: (e) =>
          new ClaudeSpawnError({
            message: `Claude CLI failed: ${e instanceof Error ? e.message : String(e)}`,
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
