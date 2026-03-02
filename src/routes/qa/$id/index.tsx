import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getApplication } from "~/server/functions/applications";
import { deleteQAEntry, getQAEntry } from "~/server/functions/qa";

export const Route = createFileRoute("/qa/$id/")({
  loader: async ({ params }) => {
    const entry = await getQAEntry({ data: { id: params.id } });
    const app = await getApplication({ data: { id: entry.application_id } });
    return { entry, app };
  },
  component: QADetail,
});

function QADetail() {
  const { entry, app } = Route.useLoaderData();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(entry.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete() {
    if (!confirm("Delete this Q&A entry?")) return;
    setDeleting(true);
    await deleteQAEntry({ data: { id: entry.id } });
    navigate({ to: "/qa" });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground/60">
            <Link
              to="/applications/$id"
              params={{ id: app.id }}
              className="hover:text-foreground transition-colors"
            >
              {app.company} — {app.role}
            </Link>
          </p>
          <h1 className="mt-1 text-xl font-bold text-foreground tracking-tight">
            {entry.question}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            to="/qa/$id/edit"
            params={{ id: entry.id }}
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:border-ring/30 transition-colors"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md border border-destructive/50 bg-card px-4 py-2 text-sm font-medium text-destructive shadow-sm hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Answer
        </h2>
        {entry.answer ? (
          <div className="flex items-start justify-between gap-4">
            <p className="whitespace-pre-wrap text-sm text-foreground">{entry.answer}</p>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Copy answer"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground/50 italic">
            No answer yet —{" "}
            <Link
              to="/qa/$id/edit"
              params={{ id: entry.id }}
              className="text-primary hover:text-primary/80"
            >
              add one
            </Link>
          </p>
        )}
      </div>

      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="text-xs text-muted-foreground/60 font-mono">
        Created {new Date(entry.created_at).toLocaleString()}
        {" | "}
        Updated {new Date(entry.updated_at).toLocaleString()}
      </div>
    </div>
  );
}
