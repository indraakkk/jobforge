import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ApplicationStatus } from "~/lib/schemas/application";

const statuses = ApplicationStatus.literals;

interface ApplicationFormData {
  company: string;
  role: string;
  url?: string | null;
  status?: string;
  job_description?: string | null;
  salary_range?: string | null;
  location?: string | null;
  platform?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  notes?: string | null;
  applied_at?: string | null;
  next_action?: string | null;
  next_action_date?: string | null;
}

interface Props {
  defaultValues?: Partial<ApplicationFormData>;
  onSubmit: (data: ApplicationFormData) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
}

const inputClass =
  "mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition-colors";

const labelClass = "block text-xs font-semibold uppercase tracking-wider text-muted-foreground";

export function ApplicationForm({ defaultValues, onSubmit, onCancel, submitLabel }: Props) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const data: ApplicationFormData = {
      company: form.get("company") as string,
      role: form.get("role") as string,
      url: (form.get("url") as string) || null,
      status: (form.get("status") as string) || "draft",
      job_description: (form.get("job_description") as string) || null,
      salary_range: (form.get("salary_range") as string) || null,
      location: (form.get("location") as string) || null,
      platform: (form.get("platform") as string) || null,
      contact_name: (form.get("contact_name") as string) || null,
      contact_email: (form.get("contact_email") as string) || null,
      notes: (form.get("notes") as string) || null,
      applied_at: (form.get("applied_at") as string) || null,
      next_action: (form.get("next_action") as string) || null,
      next_action_date: (form.get("next_action_date") as string) || null,
    };

    try {
      await onSubmit(data);
    } catch (err) {
      // React boundary: try/catch is correct here — onSubmit returns a plain Promise, not an Effect
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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="company" className={labelClass}>
            Company *
          </label>
          <input
            id="company"
            name="company"
            type="text"
            required
            defaultValue={defaultValues?.company ?? ""}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="role" className={labelClass}>
            Role *
          </label>
          <input
            id="role"
            name="role"
            type="text"
            required
            defaultValue={defaultValues?.role ?? ""}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="status" className={labelClass}>
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={defaultValues?.status ?? "draft"}
            className={inputClass}
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="url" className={labelClass}>
            Job URL
          </label>
          <input
            id="url"
            name="url"
            type="url"
            defaultValue={defaultValues?.url ?? ""}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="salary_range" className={labelClass}>
            Salary Range
          </label>
          <input
            id="salary_range"
            name="salary_range"
            type="text"
            defaultValue={defaultValues?.salary_range ?? ""}
            placeholder="e.g. 120k-150k"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="location" className={labelClass}>
            Location
          </label>
          <input
            id="location"
            name="location"
            type="text"
            defaultValue={defaultValues?.location ?? ""}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="platform" className={labelClass}>
            Platform
          </label>
          <input
            id="platform"
            name="platform"
            type="text"
            defaultValue={defaultValues?.platform ?? ""}
            placeholder="e.g. LinkedIn, Indeed"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="applied_at" className={labelClass}>
            Applied Date
          </label>
          <input
            id="applied_at"
            name="applied_at"
            type="date"
            defaultValue={defaultValues?.applied_at?.split("T")[0] ?? ""}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="contact_name" className={labelClass}>
            Contact Name
          </label>
          <input
            id="contact_name"
            name="contact_name"
            type="text"
            defaultValue={defaultValues?.contact_name ?? ""}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="contact_email" className={labelClass}>
            Contact Email
          </label>
          <input
            id="contact_email"
            name="contact_email"
            type="email"
            defaultValue={defaultValues?.contact_email ?? ""}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="next_action" className={labelClass}>
            Next Action
          </label>
          <input
            id="next_action"
            name="next_action"
            type="text"
            defaultValue={defaultValues?.next_action ?? ""}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="next_action_date" className={labelClass}>
            Next Action Date
          </label>
          <input
            id="next_action_date"
            name="next_action_date"
            type="date"
            defaultValue={defaultValues?.next_action_date?.split("T")[0] ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="job_description" className={labelClass}>
          Job Description
        </label>
        <textarea
          id="job_description"
          name="job_description"
          rows={4}
          defaultValue={defaultValues?.job_description ?? ""}
          className={`${inputClass} font-mono resize-y`}
        />
      </div>

      <div>
        <label htmlFor="notes" className={labelClass}>
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={defaultValues?.notes ?? ""}
          className={`${inputClass} font-mono resize-y`}
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
          onClick={onCancel ?? (() => navigate({ to: "/applications" }))}
          className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:border-ring/30 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
