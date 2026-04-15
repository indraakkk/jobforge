import { Schema } from "effect";

export class JobImportResult extends Schema.Class<JobImportResult>("JobImportResult")({
  company: Schema.String,
  role: Schema.String,
  location: Schema.optional(Schema.NullOr(Schema.String)),
  salary: Schema.optional(Schema.NullOr(Schema.String)),
  platform: Schema.optional(Schema.NullOr(Schema.String)),
  description: Schema.String,
  questions: Schema.Array(Schema.String),
  url: Schema.String,
}) {}
