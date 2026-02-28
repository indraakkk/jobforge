import { Schema } from "effect";

export class ApplicationNotFoundError extends Schema.TaggedError<ApplicationNotFoundError>()(
  "ApplicationNotFoundError",
  {
    id: Schema.String,
  },
) {}

export class ApplicationValidationError extends Schema.TaggedError<ApplicationValidationError>()(
  "ApplicationValidationError",
  {
    message: Schema.String,
  },
) {}
