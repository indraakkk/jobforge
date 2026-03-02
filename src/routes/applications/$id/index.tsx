import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { ConfirmDeleteDialog } from "~/components/ConfirmDeleteDialog";
import { CVPreviewPanel } from "~/components/CVPreviewPanel";
import { MarkdownRenderer } from "~/components/MarkdownRenderer";
import { QAEntryCard } from "~/components/QAEntryCard";
import { QAInlineForm } from "~/components/QAInlineForm";
import { StatusBadge } from "~/components/StatusBadge";
import { StatusPipeline } from "~/components/StatusPipeline";
import { deleteApplication, getApplication } from "~/server/functions/applications";
import { deleteQAEntry, getQAEntriesByApplication, updateQAEntry } from "~/server/functions/qa";

export const Route = createFileRoute("/applications/$id/")({
  loader: async ({ params }) => {
    const [app, qaEntries] = await Promise.all([
      getApplication({ data: { id: params.id } }),
      getQAEntriesByApplication({ data: { applicationId: params.id } }),
    ]);
    return { app, qaEntries };
  },
  component: ApplicationWorkspace,
});

function ApplicationWorkspace() {
  const { app, qaEntries } = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSaveQA(id: string, answer: string, tags: string[]) {
    await updateQAEntry({ data: { id, answer, tags } });
    router.invalidate();
  }

  async function handleDeleteQA(id: string) {
    await deleteQAEntry({ data: { id } });
    router.invalidate();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {app.role} <span className="text-muted-foreground font-normal">@ {app.company}</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            to="/applications/$id/edit"
            params={{ id: app.id }}
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:border-ring/30 transition-colors"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            disabled={deleting}
            className="rounded-md border border-destructive/50 bg-card px-4 py-2 text-sm font-medium text-destructive shadow-sm hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
          <ConfirmDeleteDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title="Delete this application?"
            description="This will permanently delete the application and cannot be undone."
            loading={deleting}
            onConfirm={async () => {
              setDeleting(true);
              try {
                await deleteApplication({ data: { id: app.id } });
                navigate({ to: "/applications" });
              } finally {
                setDeleting(false);
              }
            }}
          />
        </div>
      </div>

      <StatusPipeline status={app.status} />

      {/* Split-screen layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left panel: JD + Q&A */}
        <div className="space-y-6">
          {/* Job Description */}
          {app.job_description && (
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Job Description
              </h2>
              <div className="rounded-lg border border-border bg-card p-4 text-sm">
                <MarkdownRenderer content={app.job_description} />
              </div>
            </section>
          )}

          {/* Q&A Section */}
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Q&A ({qaEntries.length} {qaEntries.length === 1 ? "entry" : "entries"})
            </h2>
            <div className="space-y-3">
              {qaEntries.map((entry) => (
                <QAEntryCard
                  key={entry.id}
                  entry={entry}
                  onSave={handleSaveQA}
                  onDelete={handleDeleteQA}
                />
              ))}
              <QAInlineForm applicationId={app.id} onSuccess={() => router.invalidate()} />
            </div>
          </section>

          {/* Notes */}
          {app.notes && (
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Notes
              </h2>
              <div className="whitespace-pre-wrap rounded-lg border border-border bg-card p-4 text-sm text-foreground font-mono">
                {app.notes}
              </div>
            </section>
          )}
        </div>

        {/* Right panel: CV Preview */}
        <div>
          <CVPreviewPanel />
        </div>
      </div>

      {/* Bottom details */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DetailCard label="Status">
          <StatusBadge status={app.status} />
        </DetailCard>

        {app.salary_range && <DetailCard label="Salary Range">{app.salary_range}</DetailCard>}

        {app.location && <DetailCard label="Location">{app.location}</DetailCard>}

        {app.platform && <DetailCard label="Platform">{app.platform}</DetailCard>}

        {app.url && (
          <DetailCard label="Job URL">
            <a
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 transition-colors break-all text-xs"
            >
              {app.url}
            </a>
          </DetailCard>
        )}

        {app.applied_at && (
          <DetailCard label="Applied">
            <span className="font-mono">{new Date(app.applied_at).toLocaleDateString()}</span>
          </DetailCard>
        )}

        {app.contact_name && (
          <DetailCard label="Contact">
            {app.contact_name}
            {app.contact_email && (
              <>
                {" "}
                <a
                  href={`mailto:${app.contact_email}`}
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  ({app.contact_email})
                </a>
              </>
            )}
          </DetailCard>
        )}

        {app.next_action && (
          <DetailCard label="Next Action">
            {app.next_action}
            {app.next_action_date && (
              <span className="ml-2 text-xs text-muted-foreground font-mono">
                by {new Date(app.next_action_date).toLocaleDateString()}
              </span>
            )}
          </DetailCard>
        )}
      </div>

      <div className="text-xs text-muted-foreground/60 font-mono">
        Created {new Date(app.created_at).toLocaleString()}
        {" | "}
        Updated {new Date(app.updated_at).toLocaleString()}
      </div>
    </div>
  );
}

function DetailCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}
