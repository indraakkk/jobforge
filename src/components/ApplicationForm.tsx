import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MarkdownEditor } from "~/components/MarkdownEditor";
import { type ApplicationFormValues, applicationFormSchema } from "~/lib/schemas/forms";

interface Props {
  defaultValues?: { [K in keyof ApplicationFormValues]?: ApplicationFormValues[K] | null };
  onSubmit: (data: ApplicationFormValues) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
}

const statuses = [
  "draft",
  "applied",
  "screening",
  "interviewing",
  "offer",
  "accepted",
  "rejected",
  "withdrawn",
] as const;

const inputClass =
  "mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition-colors";

const labelClass = "block text-xs font-semibold uppercase tracking-wider text-muted-foreground";

const errorClass = "mt-1 text-xs text-destructive";

export function ApplicationForm({ defaultValues, onSubmit, onCancel, submitLabel }: Props) {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      company: defaultValues?.company ?? "",
      role: defaultValues?.role ?? "",
      url: defaultValues?.url ?? "",
      status: defaultValues?.status ?? ("draft" as const),
      job_description: defaultValues?.job_description ?? "",
      salary_range: defaultValues?.salary_range ?? "",
      location: defaultValues?.location ?? "",
      platform: defaultValues?.platform ?? "",
      contact_name: defaultValues?.contact_name ?? "",
      contact_email: defaultValues?.contact_email ?? "",
      notes: defaultValues?.notes ?? "",
      applied_at: defaultValues?.applied_at?.split("T")[0] ?? "",
      next_action: defaultValues?.next_action ?? "",
      next_action_date: defaultValues?.next_action_date?.split("T")[0] ?? "",
    },
    onSubmit: async ({ value }) => {
      setFormError(null);
      const parsed = applicationFormSchema.safeParse(value);
      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message ?? "Validation failed");
        return;
      }

      // Convert empty strings to null/undefined for the server
      const data: Record<string, unknown> = { ...parsed.data };
      for (const key of Object.keys(data)) {
        if (data[key] === "") data[key] = null;
      }

      try {
        await onSubmit(data as ApplicationFormValues);
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Something went wrong");
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-6"
    >
      {formError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {formError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <form.Field name="company">
          {(field) => (
            <div>
              <label htmlFor="company" className={labelClass}>
                Company *
              </label>
              <input
                id="company"
                type="text"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className={inputClass}
              />
              {field.state.meta.isTouched && !field.state.value && (
                <p className={errorClass}>Company is required</p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="role">
          {(field) => (
            <div>
              <label htmlFor="role" className={labelClass}>
                Role *
              </label>
              <input
                id="role"
                type="text"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className={inputClass}
              />
              {field.state.meta.isTouched && !field.state.value && (
                <p className={errorClass}>Role is required</p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="status">
          {(field) => (
            <div>
              <label htmlFor="status" className={labelClass}>
                Status
              </label>
              <select
                id="status"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value as (typeof statuses)[number])}
                className={inputClass}
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </form.Field>

        <form.Field name="url">
          {(field) => (
            <div>
              <label htmlFor="url" className={labelClass}>
                Job URL
              </label>
              <input
                id="url"
                type="url"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className={inputClass}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="salary_range">
          {(field) => (
            <div>
              <label htmlFor="salary_range" className={labelClass}>
                Salary Range
              </label>
              <input
                id="salary_range"
                type="text"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="e.g. 120k-150k"
                className={inputClass}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="location">
          {(field) => (
            <div>
              <label htmlFor="location" className={labelClass}>
                Location
              </label>
              <input
                id="location"
                type="text"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="platform">
          {(field) => (
            <div>
              <label htmlFor="platform" className={labelClass}>
                Platform
              </label>
              <input
                id="platform"
                type="text"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="e.g. LinkedIn, Indeed"
                className={inputClass}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="applied_at">
          {(field) => (
            <div>
              <label htmlFor="applied_at" className={labelClass}>
                Applied Date
              </label>
              <input
                id="applied_at"
                type="date"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="contact_name">
          {(field) => (
            <div>
              <label htmlFor="contact_name" className={labelClass}>
                Contact Name
              </label>
              <input
                id="contact_name"
                type="text"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="contact_email">
          {(field) => (
            <div>
              <label htmlFor="contact_email" className={labelClass}>
                Contact Email
              </label>
              <input
                id="contact_email"
                type="email"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="next_action">
          {(field) => (
            <div>
              <label htmlFor="next_action" className={labelClass}>
                Next Action
              </label>
              <input
                id="next_action"
                type="text"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="next_action_date">
          {(field) => (
            <div>
              <label htmlFor="next_action_date" className={labelClass}>
                Next Action Date
              </label>
              <input
                id="next_action_date"
                type="date"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
        </form.Field>
      </div>

      <form.Field name="job_description">
        {(field) => (
          <div>
            <span className={labelClass}>Job Description</span>
            <div className="mt-1">
              <MarkdownEditor
                value={field.state.value ?? ""}
                onChange={(val) => field.handleChange(val)}
                placeholder="Type or paste your job description here..."
              />
            </div>
          </div>
        )}
      </form.Field>

      <form.Field name="notes">
        {(field) => (
          <div>
            <label htmlFor="notes" className={labelClass}>
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className={`${inputClass} font-mono resize-y`}
            />
          </div>
        )}
      </form.Field>

      <div className="flex gap-3 pt-2">
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : submitLabel}
            </button>
          )}
        </form.Subscribe>
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
