import { Schema } from "effect";

export class AIError extends Schema.TaggedError<AIError>()("AIError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {}

export class AISessionNotFoundError extends Schema.TaggedError<AISessionNotFoundError>()(
  "AISessionNotFoundError",
  {
    id: Schema.String,
  },
) {}

