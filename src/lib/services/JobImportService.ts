import { Effect, Schema } from "effect";
import { JobImportError } from "~/lib/errors/jobImport";
import { JobImportResult } from "~/lib/schemas/jobImport";
import { ClaudeCliLayer, ClaudeCliService } from "~/lib/services/ClaudeCliService";

export { JobImportResult } from "~/lib/schemas/jobImport";

const decodeResult = Schema.decodeUnknown(JobImportResult);

const SYSTEM_PROMPT = `You are a job posting extraction assistant. You MUST respond with ONLY a valid JSON object (no markdown, no code blocks, just raw JSON) matching this schema:
{
  "company": "string (required)",
  "role": "string (required)",
  "location": "string (optional, omit if not found)",
  "salary": "string (optional, omit if not found)",
  "platform": "string (optional, e.g. Ashby, Lever, Greenhouse)",
  "description": "string (required, full markdown-formatted job description)",
  "questions": ["string array of application form questions"],
  "url": "string (required, the original URL)"
}`;

export class JobImportService extends Effect.Service<JobImportService>()("JobImportService", {
  dependencies: [ClaudeCliLayer],
  effect: Effect.gen(function* () {
    const claude = yield* ClaudeCliService;

    return {
      importFromUrl: (url: string) =>
        Effect.gen(function* () {
          const prompt = `Visit this job posting URL and extract all relevant information: ${url}

Fetch the page using WebFetch and extract:
1. **Company name** — the hiring company
2. **Job title/role** — the position title
3. **Location** — where the job is based (remote, city, etc.)
4. **Salary** — salary range if mentioned anywhere on the page
5. **Platform** — the job board platform (e.g. Ashby, Lever, Greenhouse, Workday)
6. **Job description** — the FULL job description, converted to clean markdown. Include all sections (About, Requirements, Responsibilities, Benefits, etc.)
7. **Application questions** — any specific questions the application form asks (beyond standard name/email/resume). Look for custom questions like "Tell us about...", "What is your experience with...", etc.

Return the URL as-is in the url field.
For the description, use proper markdown formatting with headers, lists, bold text, etc.
If you can't find certain optional fields, omit them.
Return ONLY valid JSON, no markdown code blocks.`;

          const response = yield* claude
            .ask(prompt, {
              systemPrompt: SYSTEM_PROMPT,
              allowedTools: ["WebFetch"],
              dangerouslySkipPermissions: true,
              maxBudgetUsd: 1,
            })
            .pipe(
              Effect.mapError(
                (e) => new JobImportError({ url, message: `Claude CLI error: ${e.message}` }),
              ),
            );

          const parsed = yield* Effect.try({
            try: () => {
              const cleaned = response.result
                .replace(/^```(?:json)?\s*/i, "")
                .replace(/\s*```\s*$/, "")
                .trim();
              return JSON.parse(cleaned);
            },
            catch: (e) =>
              new JobImportError({
                url,
                message: `Failed to parse job import result: ${e}`,
              }),
          });

          return yield* decodeResult(parsed).pipe(
            Effect.mapError(
              (e) =>
                new JobImportError({
                  url,
                  message: `Job import result validation failed: ${String(e)}`,
                }),
            ),
          );
        }),
    };
  }),
}) {}
