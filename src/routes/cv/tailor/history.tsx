import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Brain, ChevronRight } from "lucide-react";
import { useState } from "react";
import { getAISessions } from "~/server/functions/ai";

type SessionRow = {
  id: string;
  base_cv_id: string;
  base_cv_name: string | null;
  application_id: string | null;
  cv_variant_id: string | null;
  job_description_snippet: string | null;
  ai_response: string | null;
  prompt_used: string | null;
  model_used: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  status: "pending" | "completed" | "accepted" | "rejected";
  created_at: string;
};

export const Route = createFileRoute("/cv/tailor/history")({
  loader: async () => {
    const sessions = (await getAISessions({ data: {} as never })) as SessionRow[];
    return { sessions };
  },
  component: AISessionHistoryPage,
});

const statusBadge: Record<SessionRow["status"], { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  completed: {
    label: "Completed",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  accepted: {
    label: "Accepted",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
};

function SessionDetailModal({ session, onClose }: { session: SessionRow; onClose: () => void }) {
  let parsedResponse: Record<string, unknown> | null = null;
  if (session.ai_response) {
    try {
      parsedResponse = JSON.parse(session.ai_response);
    } catch {
      // raw text
    }
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop
    // biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: modal content */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal content */}
      <div
        className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">Session Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            x
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Meta */}
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Base CV</p>
              <p className="font-medium">{session.base_cv_name ?? session.base_cv_id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Model</p>
              <p className="font-medium font-mono text-xs">{session.model_used ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Tokens Used
              </p>
              <p className="font-medium">
                {session.input_tokens != null && session.output_tokens != null
                  ? `${session.input_tokens.toLocaleString()} in / ${session.output_tokens.toLocaleString()} out`
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[session.status].className}`}
              >
                {statusBadge[session.status].label}
              </span>
            </div>
          </div>

          {/* AI Response */}
          {parsedResponse ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">AI Analysis</h3>
              <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3 text-sm">
                {typeof parsedResponse.matchScore === "number" && (
                  <div>
                    <span className="font-medium">Match Score: </span>
                    <span>{parsedResponse.matchScore}%</span>
                  </div>
                )}
                {Array.isArray(parsedResponse.strengths) && (
                  <div>
                    <p className="font-medium mb-1">Strengths</p>
                    <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground">
                      {(parsedResponse.strengths as string[]).map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(parsedResponse.gaps) && (
                  <div>
                    <p className="font-medium mb-1">Gaps</p>
                    <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground">
                      {(parsedResponse.gaps as string[]).map((g) => (
                        <li key={g}>{g}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {typeof parsedResponse.tailoringNotes === "string" && (
                  <div>
                    <p className="font-medium mb-1">Tailoring Notes</p>
                    <p className="text-xs text-muted-foreground">{parsedResponse.tailoringNotes}</p>
                  </div>
                )}
                {typeof parsedResponse.suggestedCV === "string" && (
                  <div>
                    <p className="font-medium mb-1">Suggested CV</p>
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-muted p-3 rounded-md max-h-64 overflow-y-auto">
                      {parsedResponse.suggestedCV}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ) : session.ai_response ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Raw AI Response</h3>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-muted p-3 rounded-md max-h-64 overflow-y-auto">
                {session.ai_response}
              </pre>
            </div>
          ) : null}

          {/* Job description snippet */}
          {session.job_description_snippet && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Job Description (excerpt)</h3>
              <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md border border-border">
                {session.job_description_snippet}
                {session.job_description_snippet.length >= 200 ? "..." : ""}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AISessionHistoryPage() {
  const { sessions } = Route.useLoaderData();
  const [selectedSession, setSelectedSession] = useState<SessionRow | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/cv/tailor"
          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">AI Session History</h1>
          <p className="text-sm text-muted-foreground">Past AI tailoring sessions</p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Brain className="mx-auto mb-3 size-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No sessions yet</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Use AI Tailor to analyze your CV against job descriptions.
          </p>
          <Link
            to="/cv/tailor"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            Go to AI Tailor
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Base CV
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  JD Excerpt
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Tokens
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sessions.map((session) => (
                <tr
                  key={session.id}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedSession(session)}
                >
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(session.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground max-w-[150px] truncate">
                    {session.base_cv_name ?? session.base_cv_id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[250px] truncate">
                    {session.job_description_snippet ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {session.input_tokens != null && session.output_tokens != null
                      ? `${(session.input_tokens + session.output_tokens).toLocaleString()}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[session.status].className}`}
                    >
                      {statusBadge[session.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedSession && (
        <SessionDetailModal session={selectedSession} onClose={() => setSelectedSession(null)} />
      )}
    </div>
  );
}
