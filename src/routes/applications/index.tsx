import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { StatusBadge } from "~/components/StatusBadge";
import { ApplicationStatus } from "~/lib/schemas/application";
import { getApplications } from "~/server/functions/applications";

const VALID_STATUSES = new Set<string>(ApplicationStatus.literals);

const statusTabs = [
  { key: undefined, label: "All" },
  { key: "applied", label: "Applied" },
  { key: "screening", label: "Screening" },
  { key: "interviewing", label: "Interviewing" },
  { key: "offer", label: "Offers" },
  { key: "draft", label: "Drafts" },
  { key: "rejected", label: "Rejected" },
  { key: "withdrawn", label: "Withdrawn" },
] as const;

interface SearchParams {
  status?: typeof ApplicationStatus.Type;
  search?: string;
  page?: number;
}

export const Route = createFileRoute("/applications/")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    status:
      typeof search.status === "string" && VALID_STATUSES.has(search.status)
        ? (search.status as typeof ApplicationStatus.Type)
        : undefined,
    search: search.search as string | undefined,
    page: Number(search.page) || 1,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    return getApplications({
      data: {
        filters: {
          status: deps.status,
          search: deps.search,
        },
        page: deps.page,
        pageSize: 20,
        sort: { field: "updated_at", direction: "desc" },
      },
    });
  },
  component: ApplicationsList,
});

function ApplicationsList() {
  const data = Route.useLoaderData();
  const { status, search } = Route.useSearch();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Applications</h1>
        <Link
          to="/applications/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          New Application
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-1 overflow-x-auto">
          {statusTabs.map((tab) => (
            <button
              type="button"
              key={tab.label}
              onClick={() =>
                navigate({
                  to: "/applications",
                  search: { status: tab.key, search, page: 1 },
                })
              }
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                status === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search company or role..."
          defaultValue={search}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              navigate({
                to: "/applications",
                search: {
                  status,
                  search: (e.target as HTMLInputElement).value || undefined,
                  page: 1,
                },
              });
            }
          }}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
        />
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
                Location
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Applied
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.items.map((app) => (
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
                <td className="px-4 py-3 text-sm text-muted-foreground">{app.location ?? "-"}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                  {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : "-"}
                </td>
              </tr>
            ))}
            {data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No applications found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-mono">
            Page {data.page} of {data.totalPages} ({data.total} total)
          </span>
          <div className="flex gap-2">
            {data.page > 1 && (
              <button
                type="button"
                onClick={() =>
                  navigate({
                    to: "/applications",
                    search: { status, search, page: data.page - 1 },
                  })
                }
                className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-accent hover:border-ring/30 transition-colors"
              >
                Previous
              </button>
            )}
            {data.page < data.totalPages && (
              <button
                type="button"
                onClick={() =>
                  navigate({
                    to: "/applications",
                    search: { status, search, page: data.page + 1 },
                  })
                }
                className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-accent hover:border-ring/30 transition-colors"
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
