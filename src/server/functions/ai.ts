import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";
import { AppLive } from "~/lib/layers/AppLive";
import type { AIAnalysisResult } from "~/lib/schemas/aiSession";
import { AIService } from "~/lib/services/AIService";
import { CVService } from "~/lib/services/CVService";

export interface AITailorResult {
  sessionId: string;
  analysis: AIAnalysisResult;
  error?: never;
}

export interface AITailorError {
  error: string;
  sessionId?: never;
  analysis?: never;
}

export type AITailorResponse = AITailorResult | AITailorError;

export const analyzeCV = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { baseCvId: string; jobDescription: string; applicationId?: string }) => input,
  )
  .handler(async ({ data }): Promise<AITailorResponse> => {
    const result = await Effect.runPromise(
      AIService.pipe(
        Effect.flatMap((svc) =>
          svc.analyzeCV(data.baseCvId, data.jobDescription, data.applicationId),
        ),
        Effect.map((r) => ({
          sessionId: r.session.id,
          analysis: r.analysis,
        })),
        Effect.catchTag("AIError", (e) => Effect.succeed({ error: e.message })),
        Effect.catchTag("CVNotFoundError", (e) =>
          Effect.succeed({ error: `CV not found: ${e.id}` }),
        ),
        Effect.catchAll((e) => Effect.succeed({ error: `Unexpected error: ${String(e)}` })),
        Effect.provide(AppLive),
      ),
    );
    return result;
  });

export const acceptAISession = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      sessionId: string;
      baseCvId: string;
      suggestedCV: string;
      tailoringNotes: string;
      targetCompany?: string;
      targetRole?: string;
      jobDescription: string;
      applicationId?: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    return Effect.runPromise(
      Effect.gen(function* () {
        const cvService = yield* CVService;
        const aiService = yield* AIService;

        // Use the AI-generated text as the file content (plain text)
        const textBytes = new TextEncoder().encode(data.suggestedCV);
        const timestamp = new Date().toISOString().slice(0, 10);
        const fileName = `ai-tailored-${timestamp}.txt`;

        const variant = yield* cvService.uploadVariant(
          textBytes,
          fileName,
          "text/plain",
          data.baseCvId,
          {
            tailoringNotes: data.tailoringNotes,
            targetJobDescription: data.jobDescription,
            targetCompany: data.targetCompany,
            targetRole: data.targetRole,
            metadata: { source: "ai_generated", sessionId: data.sessionId },
            // Store the AI text as extracted_text directly
            extractedTextOverride: data.suggestedCV,
          },
        );

        yield* aiService.acceptSession(data.sessionId, variant.id);

        if (data.applicationId) {
          yield* cvService.linkToApplication(variant.id, data.applicationId);
        }

        return {
          variantId: variant.id,
          variantName: variant.name,
        };
      }).pipe(Effect.provide(AppLive)),
    );
  });

export const rejectAISession = createServerFn({ method: "POST" })
  .inputValidator((input: { sessionId: string }) => input)
  .handler(async ({ data }) => {
    return Effect.runPromise(
      AIService.pipe(
        Effect.flatMap((svc) => svc.rejectSession(data.sessionId)),
        Effect.provide(AppLive),
      ),
    );
  });

export const getAISessions = createServerFn({ method: "GET" })
  .inputValidator((input: Record<string, never>) => input)
  .handler(async () => {
    return Effect.runPromise(
      AIService.pipe(
        Effect.flatMap((svc) => svc.findAll()),
        Effect.map((rows) =>
          rows.map((r) => ({
            id: r.id,
            base_cv_id: r.base_cv_id,
            base_cv_name: r.base_cv_name,
            application_id: r.application_id,
            cv_variant_id: r.cv_variant_id,
            job_description_snippet: r.job_description_input
              ? r.job_description_input.slice(0, 200)
              : null,
            ai_response: r.ai_response,
            prompt_used: r.prompt_used,
            model_used: r.model_used,
            input_tokens: r.input_tokens,
            output_tokens: r.output_tokens,
            status: r.status,
            created_at:
              r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
          })),
        ),
        Effect.provide(AppLive),
      ),
    );
  });

export const getAISession = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    return Effect.runPromise(
      AIService.pipe(
        Effect.flatMap((svc) => svc.findById(data.id)),
        Effect.map((s) => ({
          id: s.id,
          base_cv_id: s.base_cv_id,
          application_id: s.application_id,
          cv_variant_id: s.cv_variant_id,
          job_description_input: s.job_description_input,
          prompt_used: s.prompt_used,
          ai_response: s.ai_response,
          model_used: s.model_used,
          input_tokens: s.input_tokens,
          output_tokens: s.output_tokens,
          status: s.status,
          created_at: s.created_at,
        })),
        Effect.provide(AppLive),
      ),
    );
  });
