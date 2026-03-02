import { Schema } from "effect";

export class JobImportError extends Schema.TaggedError<JobImportError>()("JobImportError", {
  url: Schema.String,
  message: Schema.String,
}) {}
