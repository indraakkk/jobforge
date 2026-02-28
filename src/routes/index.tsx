import { createFileRoute, Link } from "@tanstack/react-router";
import { StatusBadge } from "~/components/StatusBadge";
import { getApplicationStats, getApplications } from "~/server/functions/applications";

interface AppItem {
  id: string;
  company: string;
  role: string;
  status: string;
  url: string | null;
  location: string | null;
  salary_range: string | null;
  platform: string | null;
  applied_at: string | null;
  next_action: string | null;
  next_action_date: string | null;
  notes: string | null;
  updated_at: string;
  created_at: string;
}

export const Route = createFileRoute("/")({
  loader: async () => {
    const [stats, recent] = await Promise.all([
      getApplicationStats(),
      getApplications({ data: { pageSize: 5, sort: { field: "updated_at", direction: "desc" } } }),
    ]);
    return { stats, recent };
  },
  component: Dashboard,
});

function Dashboard() {
  const { stats, recent } = Route.useLoaderData();

  const statCards = [
    {
      label: "Total",
      value: stats.total,
      className: "bg-card border border-border text-foreground",
      valueClassName: "text-foreground",
    },
    {
      label: "Applied",
      value: stats.byStatus.applied ?? 0,
      className: "bg-blue-50 border border-blue-200 text-blue-700",
      valueClassName: "text-blue-800",
    },
    {
      label: "Interviewing",
      value: stats.byStatus.interviewing ?? 0,
      className: "bg-amber-50 border border-amber-200 text-amber-700",
      valueClassName: "text-amber-800",
    },
    {
      label: "Offers",
      value: stats.byStatus.offer ?? 0,
      className: "bg-primary/10 border border-primary/25 text-primary",
      valueClassName: "text-primary",
    },
  ];

  const followUps = (recent.items as AppItem[]).filter(
    (app) => app.next_action && !["rejected", "withdrawn", "accepted"].includes(app.status),
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <Link
          to="/applications/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          New Application
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className={`rounded-lg p-4 ${card.className}`}>
            <div className={`text-2xl font-bold ${card.valueClassName}`}>{card.value}</div>
            <div className="text-xs font-medium uppercase tracking-wider opacity-70 mt-1">
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {followUps.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Follow-ups
          </h2>
          <div className="space-y-2">
            {followUps.map((app: AppItem) => (
              <Link
                key={app.id}
                to="/applications/$id"
                params={{ id: app.id }}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 hover:bg-accent hover:border-ring/30 transition-colors"
              >
                <div>
                  <span className="font-medium text-foreground">{app.company}</span>
                  <span className="mx-2 text-muted-foreground">&mdash;</span>
                  <span className="text-muted-foreground text-sm">{app.role}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{app.next_action}</span>
                  {app.next_action_date && (
                    <span className="text-xs text-muted-foreground/60 font-mono">
                      {new Date(app.next_action_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Applications
          </h2>
          <Link
            to="/applications"
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View all
          </Link>
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(recent.items as AppItem[]).map((app) => (
                <tr key={app.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      to="/applications/$id"
                      params={{ id: app.id }}
                      className="font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      {app.company}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{app.role}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                    {new Date(app.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {recent.items.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No applications yet.{" "}
                    <Link to="/applications/new" className="text-primary hover:text-primary/80">
                      Create your first one.
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
