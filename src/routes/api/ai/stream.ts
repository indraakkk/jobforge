import { createFileRoute } from "@tanstack/react-router";
import {
  type AskOptions,
  armLifecycle,
  buildArgs,
  CLAUDE_BIN,
} from "~/lib/services/claudeCli/spawn";

/**
 * Same-origin SSE endpoint for the CV tailor live stream.
 *
 * Browser POSTs `{ prompt, options }`; this route spawns `claude
 * --output-format stream-json --verbose --include-partial-messages`,
 * arms the Paperclip-style SIGTERM/SIGKILL lifecycle, and SSE-frames each
 * stdout line back to the browser. Browser disconnect cancels the child.
 */
export const Route = createFileRoute("/api/ai/stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { prompt, options } = (await request.json()) as {
          prompt: string;
          options?: AskOptions;
        };

        const proc = Bun.spawn([CLAUDE_BIN, ...buildArgs(prompt, options ?? {}, "stream-json")], {
          stdout: "pipe",
          stderr: "pipe",
        });
        const cancelLifecycle = armLifecycle(proc);

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const enc = new TextEncoder();
            const reader = proc.stdout.getReader();
            let buffer = "";
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += new TextDecoder().decode(value);
                let idx = buffer.indexOf("\n");
                while (idx !== -1) {
                  const line = buffer.slice(0, idx).trim();
                  buffer = buffer.slice(idx + 1);
                  if (line.length > 0) {
                    controller.enqueue(enc.encode(`data: ${line}\n\n`));
                  }
                  idx = buffer.indexOf("\n");
                }
              }
              if (buffer.trim().length > 0) {
                controller.enqueue(enc.encode(`data: ${buffer.trim()}\n\n`));
              }
              const exitCode = await proc.exited;
              if (exitCode !== 0) {
                const stderr = await new Response(proc.stderr).text();
                controller.enqueue(
                  enc.encode(
                    `event: error\ndata: ${JSON.stringify({
                      exitCode,
                      stderr: stderr.slice(0, 500),
                    })}\n\n`,
                  ),
                );
              }
              controller.enqueue(enc.encode("event: done\ndata: {}\n\n"));
            } catch (err) {
              controller.enqueue(
                enc.encode(
                  `event: error\ndata: ${JSON.stringify({
                    message: err instanceof Error ? err.message : String(err),
                  })}\n\n`,
                ),
              );
            } finally {
              cancelLifecycle();
              controller.close();
            }
          },
          cancel() {
            try {
              proc.kill("SIGTERM");
            } catch {}
            cancelLifecycle();
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
