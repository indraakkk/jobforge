import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, CheckCircle, ChevronRight, Clock, Sparkles, XCircle } from "lucide-react";
import { useRef, useState } from "react";
import type { AIAnalysisResult } from "~/lib/schemas/aiSession";
import type { ClaudeStreamEvent } from "~/lib/schemas/claudeStream";
import { acceptAISession, finalizeAIStream, prepareAIStream } from "~/server/functions/ai";
import { getCVFiles, type SerializedCVFile } from "~/server/functions/cv";

export const Route = createFileRoute("/cv/tailor/")({
  loader: async () => {
    const baseCVs = (await getCVFiles({ data: {} })) as SerializedCVFile[];
    return { baseCVs };
  },
  component: AITailorPage,
});

function AITailorPage() {
  const { baseCVs } = Route.useLoaderData();

  const [baseCvId, setBaseCvId] = useState(
    baseCVs.find((cv) => cv.is_active)?.id ?? baseCVs[0]?.id ?? "",
  );
  const [jobDescription, setJobDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [editedCV, setEditedCV] = useState("");

  // Live token stream from the Claude CLI subprocess (rendered while the agent
  // works). Replaced by the parsed `analysis.suggestedCV` once finalize lands.
  const [streamingText, setStreamingText] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedVariantId, setSavedVariantId] = useState<string | null>(null);

  const selectedCV = baseCVs.find((cv) => cv.id === baseCvId);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!baseCvId || !jobDescription.trim()) return;

    setAnalyzing(true);
    setError(null);
    setAnalysis(null);
    setSessionId(null);
    setSaved(false);
    setStreamingText("");

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      // 1. Prepare: server validates CV, builds prompts, inserts pending session.
      const prep = await prepareAIStream({
        data: { baseCvId, jobDescription },
      });
      if (!prep.ok) {
        setError(prep.error);
        return;
      }
      setSessionId(prep.sessionId);

      // 2. Open SSE stream against the same-origin API route, which spawns
      // the user's local `claude` binary inline.
      const res = await fetch("/api/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prep.userPrompt,
          options: {
            systemPrompt: prep.systemPrompt,
            model: prep.model,
            tools: "",
          },
        }),
        signal: abort.signal,
      });
      if (!res.ok || !res.body) {
        setError(`Streaming failed: HTTP ${res.status}`);
        return;
      }

      let rawText = "";
      let inputTokens = 0;
      let outputTokens = 0;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      streamLoop: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by a blank line.
        let frameEnd = buffer.indexOf("\n\n");
        while (frameEnd !== -1) {
          const frame = buffer.slice(0, frameEnd);
          buffer = buffer.slice(frameEnd + 2);
          frameEnd = buffer.indexOf("\n\n");

          let eventName = "message";
          const dataLines: string[] = [];
          for (const line of frame.split("\n")) {
            if (line.startsWith("event:")) eventName = line.slice(6).trim();
            else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
          }
          const dataStr = dataLines.join("\n");

          if (eventName === "done") break streamLoop;
          if (eventName === "error") {
            setError(`Claude proxy error: ${dataStr.slice(0, 300)}`);
            break streamLoop;
          }

          let ev: ClaudeStreamEvent;
          try {
            ev = JSON.parse(dataStr) as ClaudeStreamEvent;
          } catch {
            continue;
          }

          // Token-level streaming arrives as content_block_delta. Accumulate
          // text deltas live so the user sees the model thinking.
          if (ev.type === "stream_event") {
            const sub = ev.event;
            if (sub.type === "content_block_delta" && sub.delta.type === "text_delta") {
              rawText += sub.delta.text;
              setStreamingText(rawText);
            } else if (sub.type === "message_delta" && sub.usage) {
              if (sub.usage.input_tokens) inputTokens = sub.usage.input_tokens;
              if (sub.usage.output_tokens) outputTokens = sub.usage.output_tokens;
            }
          } else if (ev.type === "result") {
            // The result event carries the canonical full text + final usage.
            // Trust this over our accumulated deltas (handles edge cases like
            // the CLI compressing whitespace or omitting partial frames).
            rawText = ev.result;
            inputTokens = ev.usage.input_tokens;
            outputTokens = ev.usage.output_tokens;
            setStreamingText(rawText);
          }
        }
      }

      if (!rawText.trim()) {
        setError("No response received from Claude");
        return;
      }

      // 3. Finalize: server parses the JSON, persists tokens, returns analysis.
      const fin = await finalizeAIStream({
        data: {
          sessionId: prep.sessionId,
          rawResponse: rawText,
          inputTokens,
          outputTokens,
        },
      });
      if (!fin.ok) {
        setError(fin.error);
        return;
      }
      setAnalysis(fin.analysis);
      setEditedCV(fin.analysis.suggestedCV);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
      abortRef.current = null;
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  async function handleAccept() {
    if (!sessionId || !analysis || !baseCvId) return;

    setSaving(true);
    try {
      const result = await acceptAISession({
        data: {
          sessionId,
          baseCvId,
          suggestedCV: editedCV,
          tailoringNotes: analysis.tailoringNotes,
          jobDescription,
        },
      });
      setSaved(true);
      setSavedVariantId(result.variantId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save variant");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Sparkles className="size-6 text-primary" />
            AI CV Tailor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Paste a job description and let AI suggest how to tailor your CV for the role.
          </p>
        </div>
        <Link
          to="/cv/tailor/history"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Clock className="size-4" />
          Session History
          <ChevronRight className="size-3" />
        </Link>
      </div>

      {baseCVs.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Brain className="mx-auto mb-3 size-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No base CVs found</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Upload a base CV first before using AI tailoring.
          </p>
          <Link
            to="/cv/upload"
            search={{ parent: "" }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            Upload CV
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left: Input panel */}
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Input
              </h2>

              <div>
                <label
                  htmlFor="base-cv"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  Base CV
                </label>
                <select
                  id="base-cv"
                  value={baseCvId}
                  onChange={(e) => setBaseCvId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                >
                  {baseCVs.map((cv) => (
                    <option key={cv.id} value={cv.id}>
                      {cv.name}
                      {cv.is_active ? " (active)" : ""}
                    </option>
                  ))}
                </select>
                {selectedCV && !selectedCV.extracted_text && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    Warning: This CV has no extracted text. AI analysis may not work.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="job-description"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  Job Description
                </label>
                <textarea
                  id="job-description"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the full job description here..."
                  rows={14}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition-colors resize-none"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              {analyzing ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled
                    data-testid="tailor-analyzing"
                    className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span className="inline-block size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Streaming...
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    data-testid="tailor-cancel"
                    className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={!baseCvId || !jobDescription.trim()}
                  data-testid="tailor-analyze"
                  className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Sparkles className="size-4" />
                  Analyze
                </button>
              )}
            </div>
          </div>

          {/* Right: Results panel */}
          <div className="lg:col-span-3 space-y-4">
            {!analysis && !analyzing && (
              <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center h-full flex flex-col items-center justify-center">
                <Brain className="size-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Select a base CV, paste a job description, and click Analyze.
                </p>
              </div>
            )}

            {analyzing && (
              <div
                className="rounded-lg border border-border bg-card p-5 space-y-3"
                data-testid="tailor-stream-panel"
              >
                <div className="flex items-center gap-2">
                  <div className="size-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-sm font-medium text-foreground">Claude is streaming...</p>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {streamingText.length} chars
                  </span>
                </div>
                <pre
                  data-testid="tailor-stream-output"
                  className="max-h-[60vh] overflow-auto rounded-md bg-muted/40 p-3 text-xs font-mono text-foreground whitespace-pre-wrap break-words"
                >
                  {streamingText || "(waiting for first token…)"}
                </pre>
              </div>
            )}

            {analysis && !analyzing && (
              <div className="space-y-4" data-testid="tailor-analysis">
                {/* Match score + summary */}
                <div className="rounded-lg border border-border bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                      Analysis
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Match Score</span>
                      <span
                        className={`text-lg font-bold ${
                          analysis.matchScore >= 70
                            ? "text-emerald-600"
                            : analysis.matchScore >= 50
                              ? "text-amber-600"
                              : "text-destructive"
                        }`}
                      >
                        {analysis.matchScore}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        analysis.matchScore >= 70
                          ? "bg-emerald-500"
                          : analysis.matchScore >= 50
                            ? "bg-amber-500"
                            : "bg-destructive"
                      }`}
                      style={{ width: `${analysis.matchScore}%` }}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <h3 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <CheckCircle className="size-3.5" />
                        Strengths
                      </h3>
                      <ul className="space-y-1">
                        {analysis.strengths.map((s) => (
                          <li key={s} className="text-xs text-foreground flex items-start gap-1.5">
                            <span className="text-emerald-500 mt-0.5">+</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <XCircle className="size-3.5" />
                        Gaps
                      </h3>
                      <ul className="space-y-1">
                        {analysis.gaps.map((g) => (
                          <li key={g} className="text-xs text-foreground flex items-start gap-1.5">
                            <span className="text-amber-500 mt-0.5">-</span>
                            {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Tailoring Notes
                    </p>
                    <p className="text-xs text-foreground">{analysis.tailoringNotes}</p>
                  </div>
                </div>

                {/* Suggested CV text - editable */}
                <div className="rounded-lg border border-border bg-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                      Tailored CV
                    </h2>
                    <span className="text-xs text-muted-foreground">Editable</span>
                  </div>
                  <textarea
                    value={editedCV}
                    onChange={(e) => setEditedCV(e.target.value)}
                    rows={20}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition-colors resize-y"
                  />

                  {saved ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="size-4" />
                        <span className="text-sm font-medium">Saved as variant!</span>
                      </div>
                      {savedVariantId && (
                        <Link
                          to="/cv/$id"
                          params={{ id: baseCvId }}
                          className="text-sm text-primary hover:underline"
                        >
                          View CV
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleAccept}
                        disabled={saving || !editedCV.trim()}
                        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {saving ? (
                          <>
                            <span className="inline-block size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="size-4" />
                            Accept and Save as Variant
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAnalysis(null);
                          setSessionId(null);
                          setEditedCV("");
                        }}
                        className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent transition-colors"
                      >
                        Start Over
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
