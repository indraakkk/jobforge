import { Schema } from "effect";

export class ClaudeSpawnError extends Schema.TaggedError<ClaudeSpawnError>()("ClaudeSpawnError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {}

export class ClaudeExitError extends Schema.TaggedError<ClaudeExitError>()("ClaudeExitError", {
  message: Schema.String,
}) {}

export class ClaudeParseError extends Schema.TaggedError<ClaudeParseError>()("ClaudeParseError", {
  message: Schema.String,
  rawOutput: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {}

export class ClaudeTimeoutError extends Schema.TaggedError<ClaudeTimeoutError>()(
  "ClaudeTimeoutError",
  {
    message: Schema.String,
    timeoutMs: Schema.Number,
  },
) {}
