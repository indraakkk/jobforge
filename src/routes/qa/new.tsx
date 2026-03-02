import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { QAForm } from "~/components/QAForm";
import { FETCH_ALL_PAGE_SIZE } from "~/lib/schemas/common";
import { getApplications } from "~/server/functions/applications";
import { createQAEntry } from "~/server/functions/qa";

export const Route = createFileRoute("/qa/new")({
  loader: async () => {
    const result = await getApplications({ data: { page: 1, pageSize: FETCH_ALL_PAGE_SIZE } });
    return { applications: result.items };
  },
  component: NewQA,
});

function NewQA() {
  const { applications } = Route.useLoaderData();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground tracking-tight">New Q&A</h1>
      <QAForm
        applications={applications}
        submitLabel="Create Q&A"
        onSubmit={async (data) => {
          const entry = await createQAEntry({ data });
          navigate({ to: "/qa/$id", params: { id: entry.id } });
        }}
      />
    </div>
  );
}
