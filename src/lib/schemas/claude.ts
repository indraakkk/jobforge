import { Schema } from "effect";

const ServerToolUse = Schema.Struct({
  web_search_requests: Schema.Number,
  web_fetch_requests: Schema.Number,
});

const ClaudeUsage = Schema.Struct({
  input_tokens: Schema.Number,
  output_tokens: Schema.Number,
  cache_creation_input_tokens: Schema.Number,
  cache_read_input_tokens: Schema.Number,
  server_tool_use: ServerToolUse,
});

export class ClaudeResponse extends Schema.Class<ClaudeResponse>("ClaudeResponse")({
  type: Schema.Literal("result"),
  subtype: Schema.String,
  is_error: Schema.Boolean,
  result: Schema.String,
  duration_ms: Schema.Number,
  num_turns: Schema.Number,
  session_id: Schema.String,
  total_cost_usd: Schema.Number,
  usage: ClaudeUsage,
  stop_reason: Schema.optional(Schema.String),
}) {}
