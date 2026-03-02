import { Schema } from "effect";

export class CVNotFoundError extends Schema.TaggedError<CVNotFoundError>()("CVNotFoundError", {
  id: Schema.String,
}) {}

export class CVValidationError extends Schema.TaggedError<CVValidationError>()(
  "CVValidationError",
  {
    message: Schema.String,
  },
) {}

export class ExtractionError extends Schema.TaggedError<ExtractionError>()("ExtractionError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {}
