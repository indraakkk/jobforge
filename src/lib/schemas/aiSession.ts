import { Schema } from "effect";
import { DateToString } from "~/lib/schemas/common";

export const AISessionStatus = Schema.Literal(
  "pending",
  "completed",
  "accepted",
  "rejected",
);
export type AISessionStatus = Schema.Schema.Type<typeof AISessionStatus>;

export class AISession extends Schema.Class<AISession>("AISession")({
  id: Schema.String,
  application_id: Schema.NullOr(Schema.String),
  base_cv_id: Schema.String,
  cv_variant_id: Schema.NullOr(Schema.String),
  job_description_input: Schema.NullOr(Schema.String),
  prompt_used: Schema.NullOr(Schema.String),
  ai_response: Schema.NullOr(Schema.String),
  model_used: Schema.NullOr(Schema.String),
  input_tokens: Schema.NullOr(Schema.Number),
  output_tokens: Schema.NullOr(Schema.Number),
  status: AISessionStatus,
  created_at: DateToString,
}) {}

export interface AIAnalysisResult {
  matchScore: number;
  strengths: string[];
  gaps: string[];
  suggestedCV: string;
  tailoringNotes: string;
}
