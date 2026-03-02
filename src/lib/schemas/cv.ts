import { Schema } from "effect";
import { DateToString } from "~/lib/schemas/common";

export class CVFile extends Schema.Class<CVFile>("CVFile")({
  id: Schema.String,
  name: Schema.String,
  file_key: Schema.String,
  file_type: Schema.String,
  file_size: Schema.Number,
  extracted_text: Schema.NullOr(Schema.String),
  is_base: Schema.Boolean,
  parent_id: Schema.NullOr(Schema.String),
  version: Schema.Number,
  metadata: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  created_at: DateToString,
  updated_at: DateToString,
}) {}

export interface CVFileWithVariantCount extends CVFile {
  readonly variant_count: number;
}
