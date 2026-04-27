/**
 * Tagged union of events emitted by `claude --output-format stream-json --verbose`.
 *
 * The CLI prints one JSON object per line on stdout. The proxy wraps each line
 * in an SSE `data:` frame; the browser parses them back out and dispatches
 * on `type` / `subtype`.
 *
 * These types reflect the publicly documented stream-json contract — the
 * same one Paperclip and T3 Code rely on. Kept as plain TS (no runtime
 * decode) because the consumer is the React client; if a downstream Effect
 * service ever needs to validate, promote to Effect Schema then.
 */

export type ClaudeContentBlock =
  | { type: "text"; text: string }
  | {
      type: "tool_use";
      id: string;
      name: string;
      input: unknown;
    }
  | {
      type: "tool_result";
      tool_use_id: string;
      content: unknown;
      is_error?: boolean;
    };

export interface ClaudeUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

/**
 * Partial-message frames emitted when the CLI is run with
 * `--include-partial-messages`. These are forwarded straight through from
 * Anthropic's SSE protocol, so they carry the same shapes as the API.
 */
export type ClaudeStreamSubEvent =
  | { type: "message_start"; message: { id: string; usage?: ClaudeUsage } }
  | {
      type: "content_block_start";
      index: number;
      content_block: ClaudeContentBlock;
    }
  | {
      type: "content_block_delta";
      index: number;
      delta:
        | { type: "text_delta"; text: string }
        | { type: "thinking_delta"; thinking: string }
        | { type: "signature_delta"; signature: string }
        | { type: "input_json_delta"; partial_json: string };
    }
  | { type: "content_block_stop"; index: number }
  | {
      type: "message_delta";
      delta: { stop_reason?: string };
      usage?: ClaudeUsage;
    }
  | { type: "message_stop" };

export type ClaudeStreamEvent =
  | {
      type: "system";
      subtype: "init";
      session_id: string;
      model?: string;
      tools?: string[];
    }
  | {
      type: "stream_event";
      event: ClaudeStreamSubEvent;
      parent_tool_use_id?: string | null;
      session_id?: string;
    }
  | {
      type: "assistant";
      message: {
        id: string;
        role: "assistant";
        model: string;
        content: ClaudeContentBlock[];
        usage?: ClaudeUsage;
        stop_reason?: string | null;
      };
    }
  | {
      type: "user";
      message: {
        role: "user";
        content: ClaudeContentBlock[];
      };
    }
  | {
      type: "result";
      subtype: string;
      is_error: boolean;
      result: string;
      session_id: string;
      duration_ms: number;
      num_turns: number;
      total_cost_usd: number;
      usage: ClaudeUsage;
      stop_reason?: string;
    };

/**
 * Pull every text block out of an assistant event. Returns "" for events
 * that carry only tool_use blocks.
 */
export function extractAssistantText(ev: ClaudeStreamEvent): string {
  if (ev.type !== "assistant") return "";
  return ev.message.content
    .filter((b): b is Extract<ClaudeContentBlock, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("");
}
