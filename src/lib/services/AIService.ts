import { SqlClient } from "@effect/sql";
import { SqlError } from "@effect/sql/SqlError";
import { DatabaseLayer } from "db/client";
import { Effect, Schema } from "effect";
import { AIError, AISessionNotFoundError } from "~/lib/errors/ai";
import { CVNotFoundError } from "~/lib/errors/cv";
import { type AIAnalysisResult, AISession } from "~/lib/schemas/aiSession";
import { ClaudeCliLayer, ClaudeCliService } from "~/lib/services/ClaudeCliService";

const _decode = Schema.decodeUnknown(AISession);
const decodeRow = (row: unknown) =>
  _decode(row).pipe(
    Effect.mapError(
      () =>
        new SqlError({
          cause: new Error("Failed to decode ai_session row"),
          message: "Decode error",
        }),
    ),
  );

function buildSystemPrompt(): string {
  return `You are an expert CV/resume tailoring assistant. Your job is to analyze a job description against a candidate's existing CV text and produce a tailored version.

You MUST respond with ONLY a valid JSON object (no markdown, no code blocks, just raw JSON) in exactly this shape:
{
  "matchScore": <integer 0-100>,
  "strengths": [<string>, ...],
  "gaps": [<string>, ...],
  "suggestedCV": "<full tailored CV text as plain text>",
  "tailoringNotes": "<concise summary of changes made>"
}

Rules:
- matchScore: how well the candidate's background matches the JD (0-100)
- strengths: list of 3-6 specific strengths the candidate has relative to this JD
- gaps: list of 2-4 gaps or areas to address (skills/experience missing or underrepresented)
- suggestedCV: the full rewritten CV text, reordering and rephrasing bullets to best match the JD; keep it honest, do not invent experience
- tailoringNotes: 2-3 sentence summary of what was changed and why`;
}

function buildUserPrompt(cvText: string, jobDescription: string): string {
  return `## Candidate CV
${cvText}

## Job Description
${jobDescription}

Analyze the CV against the job description and return the JSON response as instructed.`;
}

export class AIService extends Effect.Service<AIService>()("AIService", {
  dependencies: [DatabaseLayer, ClaudeCliLayer],
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const claude = yield* ClaudeCliService;

    return {
      analyzeCV: (baseCvId: string, jobDescription: string, applicationId?: string) =>
        Effect.gen(function* () {
          // Fetch base CV text
          const cvRows = yield* sql`
            SELECT id, extracted_text FROM cv_files WHERE id = ${baseCvId} AND is_base = true
          `;
          if (cvRows.length === 0) {
            return yield* new CVNotFoundError({ id: baseCvId });
          }
          const cvText = (cvRows[0].extracted_text as string | null) ?? "";
          if (!cvText.trim()) {
            return yield* new AIError({
              message:
                "This CV has no extracted text. Please re-upload or ensure text extraction succeeded.",
            });
          }

          const systemPrompt = buildSystemPrompt();
          const userPrompt = buildUserPrompt(cvText, jobDescription);

          // Insert session as pending
          const appIdValue = applicationId ?? null;
          const modelUsed = "sonnet";
          const sessionRows = yield* sql`
            INSERT INTO ai_sessions (base_cv_id, application_id, job_description_input, prompt_used, model_used, status)
            VALUES (${baseCvId}, ${appIdValue}, ${jobDescription}, ${`${systemPrompt}\n\n${userPrompt}`}, ${modelUsed}, 'pending')
            RETURNING *
          `;
          const session = yield* decodeRow(sessionRows[0]);

          // Call Claude CLI
          const response = yield* claude
            .ask(userPrompt, {
              systemPrompt,
              tools: "",
            })
            .pipe(
              Effect.mapError(
                (e) => new AIError({ message: `Claude CLI error: ${e.message}`, cause: e }),
              ),
            );

          const rawContent = response.result;
          const inputTokens = response.usage.input_tokens;
          const outputTokens = response.usage.output_tokens;

          // Parse AI response JSON
          const analysis = yield* Effect.try({
            try: () => {
              const cleaned = rawContent
                .replace(/^```(?:json)?\s*/i, "")
                .replace(/\s*```\s*$/, "")
                .trim();
              return JSON.parse(cleaned) as AIAnalysisResult;
            },
            catch: (e) =>
              new AIError({
                message: "Failed to parse AI response as JSON",
                cause: e,
              }),
          });

          // Update session to completed
          yield* sql`
            UPDATE ai_sessions
            SET
              status = 'completed',
              ai_response = ${rawContent},
              input_tokens = ${inputTokens},
              output_tokens = ${outputTokens}
            WHERE id = ${session.id}
          `;

          const updatedRows = yield* sql`SELECT * FROM ai_sessions WHERE id = ${session.id}`;
          const updatedSession = yield* decodeRow(updatedRows[0]);

          return { session: updatedSession, analysis };
        }),

      /**
       * Prepare a streaming session: validates the CV, builds prompts,
       * inserts a pending ai_session row. Returns everything the browser
       * needs to open the SSE stream against the same-origin
       * `/api/ai/stream` route.
       *
       * Pairs with `finalizeStreamingSession` once the stream completes.
       */
      prepareStreamingSession: (baseCvId: string, jobDescription: string, applicationId?: string) =>
        Effect.gen(function* () {
          const cvRows = yield* sql`
            SELECT id, extracted_text FROM cv_files WHERE id = ${baseCvId} AND is_base = true
          `;
          if (cvRows.length === 0) {
            return yield* new CVNotFoundError({ id: baseCvId });
          }
          const cvText = (cvRows[0].extracted_text as string | null) ?? "";
          if (!cvText.trim()) {
            return yield* new AIError({
              message:
                "This CV has no extracted text. Please re-upload or ensure text extraction succeeded.",
            });
          }

          const systemPrompt = buildSystemPrompt();
          const userPrompt = buildUserPrompt(cvText, jobDescription);
          const appIdValue = applicationId ?? null;
          const modelUsed = "sonnet";

          const sessionRows = yield* sql`
            INSERT INTO ai_sessions (base_cv_id, application_id, job_description_input, prompt_used, model_used, status)
            VALUES (${baseCvId}, ${appIdValue}, ${jobDescription}, ${`${systemPrompt}\n\n${userPrompt}`}, ${modelUsed}, 'pending')
            RETURNING *
          `;
          const session = yield* decodeRow(sessionRows[0]);

          return {
            session,
            systemPrompt,
            userPrompt,
            model: modelUsed,
          };
        }),

      /**
       * Finalize a streaming session: parses the raw text accumulated by the
       * browser, persists tokens, and returns the structured analysis.
       */
      finalizeStreamingSession: (
        sessionId: string,
        rawResponse: string,
        inputTokens: number,
        outputTokens: number,
      ) =>
        Effect.gen(function* () {
          const analysis = yield* Effect.try({
            try: () => {
              const cleaned = rawResponse
                .replace(/^```(?:json)?\s*/i, "")
                .replace(/\s*```\s*$/, "")
                .trim();
              return JSON.parse(cleaned) as AIAnalysisResult;
            },
            catch: (e) =>
              new AIError({
                message: "Failed to parse streamed AI response as JSON",
                cause: e,
              }),
          });

          yield* sql`
            UPDATE ai_sessions
            SET
              status = 'completed',
              ai_response = ${rawResponse},
              input_tokens = ${inputTokens},
              output_tokens = ${outputTokens}
            WHERE id = ${sessionId}
          `;

          const updatedRows = yield* sql`SELECT * FROM ai_sessions WHERE id = ${sessionId}`;
          if (updatedRows.length === 0) {
            return yield* new AISessionNotFoundError({ id: sessionId });
          }
          const session = yield* decodeRow(updatedRows[0]);
          return { session, analysis };
        }),

      acceptSession: (sessionId: string, cvVariantId: string) =>
        Effect.gen(function* () {
          yield* sql`
            UPDATE ai_sessions
            SET status = 'accepted', cv_variant_id = ${cvVariantId}
            WHERE id = ${sessionId}
          `;
        }),

      rejectSession: (sessionId: string) =>
        Effect.gen(function* () {
          yield* sql`
            UPDATE ai_sessions SET status = 'rejected' WHERE id = ${sessionId}
          `;
        }),

      findById: (id: string) =>
        Effect.gen(function* () {
          const rows = yield* sql`SELECT * FROM ai_sessions WHERE id = ${id}`;
          if (rows.length === 0) {
            return yield* new AISessionNotFoundError({ id });
          }
          return yield* decodeRow(rows[0]);
        }),

      findAll: () =>
        Effect.gen(function* () {
          const rows = yield* sql`
            SELECT s.*, c.name as base_cv_name
            FROM ai_sessions s
            LEFT JOIN cv_files c ON c.id = s.base_cv_id
            ORDER BY s.created_at DESC
          `;
          return rows as unknown as Array<{
            id: string;
            base_cv_id: string;
            base_cv_name: string | null;
            application_id: string | null;
            cv_variant_id: string | null;
            job_description_input: string | null;
            prompt_used: string | null;
            ai_response: string | null;
            model_used: string | null;
            input_tokens: number | null;
            output_tokens: number | null;
            status: "pending" | "completed" | "accepted" | "rejected";
            created_at: Date;
          }>;
        }),
    } as const;
  }),
}) {}
