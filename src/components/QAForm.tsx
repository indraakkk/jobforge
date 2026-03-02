import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

interface QAFormData {
  question: string;
  answer: string;
  tags: string[];
  application_id: string;
}

interface ApplicationOption {
  id: string;
  company: string;
  role: string;
}

interface Props {
  defaultValues?: Partial<QAFormData>;
  applications: ApplicationOption[];
  onSubmit: (data: QAFormData) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
  hideApplicationSelect?: boolean;
}

const inputClass =
  "mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition-colors";

const labelClass = "block text-xs font-semibold uppercase tracking-wider text-muted-foreground";

export function QAForm({
  defaultValues,
  applications,
  onSubmit,
  onCancel,
  submitLabel,
  hideApplicationSelect,
}: Props) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const tagsRaw = (form.get("tags") as string) || "";
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const data: QAFormData = {
      question: form.get("question") as string,
      answer: (form.get("answer") as string) || "",
      tags,
      application_id: (form.get("application_id") as string) || defaultValues?.application_id || "",
    };

    try {
      await onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!hideApplicationSelect && (
        <div>
          <label htmlFor="application_id" className={labelClass}>
            Application *
          </label>
          <select
            id="application_id"
            name="application_id"
            required
            defaultValue={defaultValues?.application_id ?? ""}
            className={inputClass}
          >
            <option value="">Select an application...</option>
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.company} — {app.role}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="question" className={labelClass}>
          Question *
        </label>
        <input
          id="question"
          name="question"
          type="text"
          required
          defaultValue={defaultValues?.question ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="answer" className={labelClass}>
          Answer
        </label>
        <textarea
          id="answer"
          name="answer"
          rows={5}
          defaultValue={defaultValues?.answer ?? ""}
          className={`${inputClass} font-mono resize-y`}
        />
      </div>

      <div>
        <label htmlFor="tags" className={labelClass}>
          Tags (comma-separated)
        </label>
        <input
          id="tags"
          name="tags"
          type="text"
          defaultValue={defaultValues?.tags?.join(", ") ?? ""}
          placeholder="e.g. behavioral, technical, leadership"
          className={inputClass}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel ?? (() => navigate({ to: "/qa" }))}
          className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:border-ring/30 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
