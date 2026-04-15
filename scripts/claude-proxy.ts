/**
 * Claude CLI Proxy — standalone Bun HTTP server
 *
 * Runs outside Vite's SSR pipeline so Bun.spawn works reliably.
 * The app's ClaudeCliService calls this via fetch.
 *
 * Start: bun run scripts/claude-proxy.ts
 * Config: CLAUDE_BIN, CLAUDE_MODEL, CLAUDE_PROXY_PORT
 */

const CLAUDE_BIN = process.env.CLAUDE_BIN ?? "claude";
const DEFAULT_MODEL = process.env.CLAUDE_MODEL ?? "sonnet";
const PORT = Number(process.env.CLAUDE_PROXY_PORT ?? "3001");

interface AskOptions {
	readonly model?: string;
	readonly systemPrompt?: string;
	readonly allowedTools?: string[];
	readonly tools?: string;
	readonly maxBudgetUsd?: number;
	readonly dangerouslySkipPermissions?: boolean;
	readonly noSessionPersistence?: boolean;
	readonly additionalArgs?: string[];
}

function buildArgs(prompt: string, opts: AskOptions = {}): string[] {
	const args: string[] = [
		"-p",
		prompt,
		"--output-format",
		"json",
		"--model",
		opts.model ?? DEFAULT_MODEL,
	];

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

Bun.serve({
	port: PORT,
	async fetch(req) {
		if (req.method !== "POST" || new URL(req.url).pathname !== "/ask") {
			return new Response("Not found", { status: 404 });
		}

		const { prompt, options } = (await req.json()) as {
			prompt: string;
			options?: AskOptions;
		};
		const args = buildArgs(prompt, options);

		const proc = Bun.spawn([CLAUDE_BIN, ...args], {
			stdout: "pipe",
			stderr: "pipe",
		});

		const [stdout, stderr] = await Promise.all([
			new Response(proc.stdout).text(),
			new Response(proc.stderr).text(),
		]);
		const exitCode = await proc.exited;

		if (exitCode !== 0 && !stdout.trim()) {
			return Response.json(
				{ ok: false, error: stderr.slice(0, 500), exitCode },
				{ status: 502 },
			);
		}

		return Response.json({ ok: true, stdout });
	},
});

console.log(`Claude CLI proxy listening on http://localhost:${PORT}`);
