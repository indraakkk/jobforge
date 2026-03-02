import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { qaFormSchema } from "~/lib/schemas/forms";

interface QAFormData {
  question: string;
  answer: string;
  tags: readonly string[];
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

const errorClass = "mt-1 text-xs text-destructive";

export function QAForm({
  defaultValues,
  applications,
  onSubmit,
  onCancel,
  submitLabel,
  hideApplicationSelect,
}: Props) {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      question: defaultValues?.question ?? "",
      answer: defaultValues?.answer ?? "",
      tags: defaultValues?.tags?.join(", ") ?? "",
      application_id: defaultValues?.application_id ?? "",
    },
    onSubmit: async ({ value }) => {
      setFormError(null);
      const parsed = qaFormSchema.safeParse(value);
      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message ?? "Validation failed");
        return;
      }

      const tags = parsed.data.tags
        ? parsed.data.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      try {
        await onSubmit({
          question: parsed.data.question,
          answer: parsed.data.answer ?? "",
          tags,
          application_id: parsed.data.application_id,
        });
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

      {!hideApplicationSelect && (
        <form.Field name="application_id">
          {(field) => (
            <div>
              <label htmlFor="application_id" className={labelClass}>
                Application *
              </label>
              <select
                id="application_id"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className={inputClass}
              >
                <option value="">Select an application...</option>
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.company} — {app.role}
                  </option>
                ))}
              </select>
              {field.state.meta.isTouched && !field.state.value && (
                <p className={errorClass}>Application is required</p>
              )}
            </div>
          )}
        </form.Field>
      )}

      <form.Field name="question">
        {(field) => (
          <div>
            <label htmlFor="question" className={labelClass}>
              Question *
            </label>
            <input
              id="question"
              type="text"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              className={inputClass}
            />
            {field.state.meta.isTouched && !field.state.value && (
              <p className={errorClass}>Question is required</p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="answer">
        {(field) => (
          <div>
            <label htmlFor="answer" className={labelClass}>
              Answer
            </label>
            <textarea
              id="answer"
              rows={5}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className={`${inputClass} font-mono resize-y`}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="tags">
        {(field) => (
          <div>
            <label htmlFor="tags" className={labelClass}>
              Tags (comma-separated)
            </label>
            <input
              id="tags"
              type="text"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="e.g. behavioral, technical, leadership"
              className={inputClass}
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
          onClick={
            onCancel ?? (() => navigate({ to: "/qa", search: { query: "", tags: "", page: 1 } }))
          }
          className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:border-ring/30 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
