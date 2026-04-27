/**
 * Shared `claude` CLI spawn helpers — used by both the non-streaming
 * `ClaudeCliService.ask` path (JD import) and the same-origin SSE route
 * `src/routes/api/ai/stream.ts` (CV tailor live stream).
 *
 * Auth model: spawn the user's local `claude` binary; let it read its own
 * `~/.claude/` credentials. Same approach Paperclip / T3 Code use.
 */

export interface AskOptions {
  readonly model?: string;
  readonly systemPrompt?: string;
  readonly allowedTools?: ReadonlyArray<string>;
  readonly tools?: string;
  readonly maxBudgetUsd?: number;
  readonly dangerouslySkipPermissions?: boolean;
  readonly noSessionPersistence?: boolean;
  readonly additionalArgs?: ReadonlyArray<string>;
}

export const CLAUDE_BIN = process.env.CLAUDE_BIN ?? "claude";
export const DEFAULT_MODEL = process.env.CLAUDE_MODEL ?? "sonnet";
export const TIMEOUT_SEC = Number(process.env.CLAUDE_TIMEOUT_SEC ?? "900");
export const GRACE_SEC = Number(process.env.CLAUDE_GRACE_SEC ?? "30");

export function buildArgs(
  prompt: string,
  opts: AskOptions,
  format: "json" | "stream-json",
): string[] {
  const args: string[] = [
    "-p",
    prompt,
    "--output-format",
    format,
    "--model",
    opts.model ?? DEFAULT_MODEL,
  ];

  if (format === "stream-json") {
    // stream-json output requires --verbose (CLI rejects it otherwise).
    // --include-partial-messages emits content_block_delta events so we
    // see token-level streaming, not just one assistant block at the end.
    args.push("--verbose", "--include-partial-messages");
  }
  if (opts.systemPrompt !== undefined) {
    args.push("--system-prompt", opts.systemPrompt);
  }
  if (opts.tools !== undefined) {
    args.push("--tools", opts.tools);
  }
  if (opts.allowedTools && opts.allowedTools.length > 0) {
    args.push("--allowedTools", opts.allowedTools.join(","));
  }
  if (opts.noSessionPersistence ?? true) {
    args.push("--no-session-persistence");
  }
  if (opts.dangerouslySkipPermissions) {
    args.push("--dangerously-skip-permissions");
  }
  if (opts.maxBudgetUsd !== undefined) {
    args.push("--max-budget-usd", String(opts.maxBudgetUsd));
  }
  if (opts.additionalArgs) {
    args.push(...opts.additionalArgs);
  }

  return args;
}

type Killable = { kill: (sig?: number | NodeJS.Signals) => void | boolean };

/**
 * Paperclip-style lifecycle: SIGTERM at the timeout, SIGKILL after the grace
 * window. Returns a cancel fn — call it on natural exit so the timers don't
 * fire against an already-dead PID.
 */
export function armLifecycle(
  proc: Killable,
  timeoutSec: number = TIMEOUT_SEC,
  graceSec: number = GRACE_SEC,
): () => void {
  const term = setTimeout(() => {
    try {
      proc.kill("SIGTERM");
    } catch {}
    console.warn(`[claude] SIGTERM after ${timeoutSec}s timeout`);
  }, timeoutSec * 1000);
  const kill = setTimeout(
    () => {
      try {
        proc.kill("SIGKILL");
      } catch {}
      console.warn(`[claude] SIGKILL after ${timeoutSec + graceSec}s`);
    },
    (timeoutSec + graceSec) * 1000,
  );
  return () => {
    clearTimeout(term);
    clearTimeout(kill);
  };
}
