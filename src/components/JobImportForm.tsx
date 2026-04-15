import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { MarkdownEditor } from "~/components/MarkdownEditor";
import type { JobImportResult } from "~/lib/services/JobImportService";
import { createApplication } from "~/server/functions/applications";
import { importJobFromUrl } from "~/server/functions/jobImport";
import { createQAEntry } from "~/server/functions/qa";

const inputClass =
  "mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition-colors";

const labelClass = "block text-xs font-semibold uppercase tracking-wider text-muted-foreground";

export function JobImportForm() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JobImportResult | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    existingId: string;
    existingCompany: string;
    existingRole: string;
  } | null>(null);

  // Editable fields after import
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [salary, setSalary] = useState("");
  const [platform, setPlatform] = useState("");
  const [description, setDescription] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState<Record<number, boolean>>({});

  function populateFields(data: JobImportResult) {
    setResult(data);
    setCompany(data.company);
    setRole(data.role);
    setLocation(data.location ?? "");
    setSalary(data.salary ?? "");
    setPlatform(data.platform ?? "");
    setDescription(data.description);
    const qs: Record<number, boolean> = {};
    data.questions.forEach((_, i) => {
      qs[i] = true;
    });
    setSelectedQuestions(qs);
  }

  async function handleImport() {
    if (!url.trim()) return;
    setImporting(true);
    setError(null);
    setResult(null);
    setDuplicateInfo(null);

    try {
      const response = await importJobFromUrl({ data: { url: url.trim() } });
      if (response.type === "duplicate") {
        setDuplicateInfo({
          existingId: response.existingId,
          existingCompany: response.existingCompany,
          existingRole: response.existingRole,
        });
      } else {
        populateFields(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import job posting");
    } finally {
      setImporting(false);
    }
  }

  async function handleForceImport() {
    setImporting(true);
    setError(null);
    setDuplicateInfo(null);

    try {
      const response = await importJobFromUrl({ data: { url: url.trim(), force: true } });
      if (response.type === "ok") {
        populateFields(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import job posting");
    } finally {
      setImporting(false);
    }
  }

  async function handleCreate() {
    if (!company.trim() || !role.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const app = await createApplication({
        data: {
          company: company.trim(),
          role: role.trim(),
          url: url.trim() || null,
          status: "draft",
          job_description: description || null,
          salary_range: salary || null,
          location: location || null,
          platform: platform || null,
        },
      });

      // Create Q&A entries for selected questions
      if (result?.questions) {
        const selected = result.questions.filter((_, i) => selectedQuestions[i]);
        await Promise.all(
          selected.map((question) =>
            createQAEntry({
              data: { application_id: app.id, question, answer: "", tags: [] },
            }),
          ),
        );
      }

      navigate({ to: "/applications/$id", params: { id: app.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create application");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {duplicateInfo && (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
          <p className="font-medium">
            Already imported: {duplicateInfo.existingCompany} &mdash; {duplicateInfo.existingRole}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <Link
              to="/applications/$id"
              params={{ id: duplicateInfo.existingId }}
              className="text-sm font-medium underline underline-offset-2 hover:text-amber-800 dark:hover:text-amber-300"
            >
              View existing
            </Link>
            <button
              type="button"
              onClick={handleForceImport}
              disabled={importing}
              className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-sm font-medium hover:bg-amber-500/20 transition-colors disabled:opacity-50"
            >
              {importing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-3 animate-spin" />
                  Importing...
                </span>
              ) : (
                "Import anyway"
              )}
            </button>
          </div>
        </div>
      )}

      {/* URL input */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="import-url" className={labelClass}>
            Job Posting URL
          </label>
          <input
            id="import-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://jobs.ashbyhq.com/company/position..."
            className={inputClass}
            disabled={importing}
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleImport}
            disabled={importing || !url.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {importing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Importing...
              </span>
            ) : (
              "Import"
            )}
          </button>
        </div>
      </div>

      {importing && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          Fetching and analyzing job posting with AI... This may take a moment.
        </div>
      )}

      {/* Auto-populated fields */}
      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="company" className={labelClass}>
                Company *
              </label>
              <input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="role" className={labelClass}>
                Role *
              </label>
              <input
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="location" className={labelClass}>
                Location
              </label>
              <input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="salary" className={labelClass}>
                Salary Range
              </label>
              <input
                id="salary"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="platform" className={labelClass}>
                Platform
              </label>
              <input
                id="platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="url-display" className={labelClass}>
                URL
              </label>
              <input
                id="url-display"
                value={url}
                readOnly
                className={`${inputClass} text-muted-foreground`}
              />
            </div>
          </div>

          <div>
            <span className={labelClass}>Job Description (Markdown)</span>
            <div className="mt-1">
              <MarkdownEditor value={description} onChange={setDescription} height={400} />
            </div>
          </div>

          {result.questions.length > 0 && (
            <div>
              <span className={labelClass}>Detected Questions ({result.questions.length})</span>
              <div className="mt-2 space-y-2">
                {result.questions.map((q, i) => (
                  <label
                    key={q}
                    className="flex items-start gap-2 rounded-md border border-border bg-card p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={!!selectedQuestions[i]}
                      onChange={(e) =>
                        setSelectedQuestions((prev) => ({ ...prev, [i]: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-input"
                    />
                    <span className="text-sm text-foreground">{q}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting || !company.trim() || !role.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Application"}
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/applications" })}
              className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:border-ring/30 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
