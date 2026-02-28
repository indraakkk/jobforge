import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { StatusBadge } from "~/components/StatusBadge";
import { StatusPipeline } from "~/components/StatusPipeline";
import { deleteApplication, getApplication } from "~/server/functions/applications";

export const Route = createFileRoute("/applications/$id")({
  loader: async ({ params }) => {
    return getApplication({ data: { id: params.id } });
  },
  component: ApplicationDetail,
});

function ApplicationDetail() {
  const app = Route.useLoaderData();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this application?")) return;
    setDeleting(true);
    await deleteApplication({ data: { id: app.id } });
    navigate({ to: "/applications" });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{app.company}</h1>
          <p className="text-base text-muted-foreground mt-0.5">{app.role}</p>
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
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md border border-destructive/50 bg-card px-4 py-2 text-sm font-medium text-destructive shadow-sm hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      <StatusPipeline status={app.status} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              className="text-primary hover:text-primary/80 transition-colors break-all"
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
              <span className="ml-2 text-sm text-muted-foreground font-mono">
                by {new Date(app.next_action_date).toLocaleDateString()}
              </span>
            )}
          </DetailCard>
        )}
      </div>

      {app.job_description && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Job Description
          </h2>
          <div className="whitespace-pre-wrap rounded-lg border border-border bg-card p-4 text-sm text-foreground font-mono">
            {app.job_description}
          </div>
        </section>
      )}

      {app.notes && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Notes
          </h2>
          <div className="whitespace-pre-wrap rounded-lg border border-border bg-card p-4 text-sm text-foreground font-mono">
            {app.notes}
          </div>
        </section>
      )}

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
