import { Schema } from "effect";

export class QANotFoundError extends Schema.TaggedError<QANotFoundError>()("QANotFoundError", {
  id: Schema.String,
}) {}

export class QAValidationError extends Schema.TaggedError<QAValidationError>()(
  "QAValidationError",
  {
    message: Schema.String,
  },
) {}
