import { Schema } from "effect";
import { DateToString } from "~/lib/schemas/common";

export class QAEntry extends Schema.Class<QAEntry>("QAEntry")({
  id: Schema.String,
  application_id: Schema.String,
  question: Schema.String,
  answer: Schema.String,
  tags: Schema.Array(Schema.String),
  created_at: DateToString,
  updated_at: DateToString,
}) {}

export class CreateQAEntry extends Schema.Class<CreateQAEntry>("CreateQAEntry")({
  application_id: Schema.String,
  question: Schema.String,
  answer: Schema.optionalWith(Schema.String, { default: () => "" }),
  tags: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] as string[] }),
}) {}

export class UpdateQAEntry extends Schema.Class<UpdateQAEntry>("UpdateQAEntry")({
  question: Schema.optional(Schema.String),
  answer: Schema.optional(Schema.String),
  tags: Schema.optional(Schema.Array(Schema.String)),
}) {}

export interface QASearchFilters {
  readonly query?: string;
  readonly tags?: string[];
  readonly applicationId?: string;
}
