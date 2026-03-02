import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { QAEntryCard } from "~/components/QAEntryCard";
import { FETCH_ALL_PAGE_SIZE } from "~/lib/schemas/common";
import { getApplications } from "~/server/functions/applications";
import { deleteQAEntry, getQAEntries, getQATags, updateQAEntry } from "~/server/functions/qa";

export const Route = createFileRoute("/qa/")({
  validateSearch: (search: Record<string, unknown>) => ({
    query: (search.query as string) ?? "",
    tags: (search.tags as string) ?? "",
    page: Number(search.page ?? 1),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const activeTags = deps.tags ? deps.tags.split(",").filter(Boolean) : [];

    const [qaResult, allTags, appsResult] = await Promise.all([
      getQAEntries({
        data: {
          filters: {
            query: deps.query || undefined,
            tags: activeTags.length > 0 ? activeTags : undefined,
          },
          page: deps.page,
          pageSize: 20,
        },
      }),
      getQATags({ data: undefined }),
      getApplications({ data: { page: 1, pageSize: FETCH_ALL_PAGE_SIZE } }),
    ]);

    // Build a map of application_id → "Company — Role"
    const appMap: Record<string, string> = {};
    for (const app of appsResult.items) {
      appMap[app.id] = `${app.company} — ${app.role}`;
    }

    return { qaResult, allTags, appMap };
  },
  component: QABrowse,
});

function QABrowse() {
  const { qaResult, allTags, appMap } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/qa/" });

  const [searchInput, setSearchInput] = useState(search.query);
  const activeTags = search.tags ? search.tags.split(",").filter(Boolean) : [];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({
      search: { query: searchInput, tags: search.tags, page: 1 },
    });
  }

  function toggleTag(tag: string) {
    const current = new Set(activeTags);
    if (current.has(tag)) {
      current.delete(tag);
    } else {
      current.add(tag);
    }
    navigate({
      search: {
        query: search.query,
        tags: [...current].join(","),
        page: 1,
      },
    });
  }

  async function handleSave(id: string, answer: string, tags: string[]) {
    await updateQAEntry({ data: { id, answer, tags } });
    navigate({ search: { query: search.query, tags: search.tags, page: search.page } });
  }

  async function handleDelete(id: string) {
    await deleteQAEntry({ data: { id } });
    navigate({ search: { query: search.query, tags: search.tags, page: search.page } });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Q&A Vault</h1>
        <Link
          to="/qa/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Plus className="size-4" />
            New Q&A
          </span>
        </Link>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search questions and answers..."
            className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          Search
        </button>
      </form>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((tag) => (
            <button key={tag} type="button" onClick={() => toggleTag(tag)}>
              <Badge
                variant={activeTags.includes(tag) ? "default" : "secondary"}
                className="cursor-pointer"
              >
                {tag}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {qaResult.items.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {search.query || activeTags.length > 0
              ? "No Q&A entries match your search."
              : "No Q&A entries yet. Create one or import a job posting to get started."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {qaResult.items.map((entry) => (
            <QAEntryCard
              key={entry.id}
              entry={entry}
              applicationName={appMap[entry.application_id]}
              showAppLink
              onSave={handleSave}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {qaResult.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 text-sm">
          <button
            type="button"
            disabled={search.page <= 1}
            onClick={() =>
              navigate({
                search: { query: search.query, tags: search.tags, page: search.page - 1 },
              })
            }
            className="rounded-md border border-border bg-card px-3 py-1.5 text-foreground disabled:opacity-50 hover:bg-accent transition-colors"
          >
            Previous
          </button>
          <span className="text-muted-foreground">
            Page {search.page} of {qaResult.totalPages}
          </span>
          <button
            type="button"
            disabled={search.page >= qaResult.totalPages}
            onClick={() =>
              navigate({
                search: { query: search.query, tags: search.tags, page: search.page + 1 },
              })
            }
            className="rounded-md border border-border bg-card px-3 py-1.5 text-foreground disabled:opacity-50 hover:bg-accent transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
