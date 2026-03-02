import { query } from "@anthropic-ai/claude-agent-sdk";
import { Effect } from "effect";
import { z } from "zod/v4";
import { JobImportError } from "~/lib/errors/jobImport";

export const JobImportResult = z.object({
  company: z.string().describe("Company name"),
  role: z.string().describe("Job title/role"),
  location: z.string().optional().describe("Job location (e.g. Remote, NYC, etc.)"),
  salary: z.string().optional().describe("Salary range if mentioned in the posting"),
  platform: z
    .string()
    .optional()
    .describe("Job board platform name (e.g. Ashby, Lever, Greenhouse)"),
  description: z.string().describe("Full job description converted to clean markdown format"),
  questions: z.array(z.string()).describe("Application questions found in the job posting form"),
  url: z.string().describe("The original job posting URL"),
});

export type JobImportResult = z.infer<typeof JobImportResult>;

export class JobImportService extends Effect.Service<JobImportService>()("JobImportService", {
  succeed: {
    importFromUrl: (url: string) =>
      Effect.tryPromise({
        try: async () => {
          // NOTE: process.env used intentionally — Agent SDK requires a plain env object.
          const cleanEnv = { ...process.env };
          delete (cleanEnv as Record<string, unknown>).CLAUDECODE;

          const jsonSchema = z.toJSONSchema(JobImportResult) as Record<string, unknown>;
          delete jsonSchema.$schema;

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
If you can't find certain optional fields, omit them.`;

          const conversation = query({
            prompt,
            options: {
              tools: ["WebFetch"],
              outputFormat: { type: "json_schema", schema: jsonSchema },
              permissionMode: "bypassPermissions",
              allowDangerouslySkipPermissions: true,
              maxTurns: 10,
              model: "sonnet",
              persistSession: false,
              env: cleanEnv,
            },
          });

          for await (const message of conversation) {
            if (message.type === "result" && message.subtype === "success") {
              const parsed = JobImportResult.safeParse(message.structured_output);
              if (parsed.success) {
                return parsed.data;
              }
              throw new Error(`Schema validation failed: ${JSON.stringify(parsed.error)}`);
            }
          }
          throw new Error("Agent returned no result");
        },
        catch: (error) =>
          new JobImportError({
            url,
            message: error instanceof Error ? error.message : String(error),
          }),
      }),
  },
}) {}
