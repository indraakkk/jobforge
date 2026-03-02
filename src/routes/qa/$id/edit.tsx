import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { QAForm } from "~/components/QAForm";
import { FETCH_ALL_PAGE_SIZE } from "~/lib/schemas/common";
import { getApplications } from "~/server/functions/applications";
import { getQAEntry, updateQAEntry } from "~/server/functions/qa";

export const Route = createFileRoute("/qa/$id/edit")({
  loader: async ({ params }) => {
    const [entry, appsResult] = await Promise.all([
      getQAEntry({ data: { id: params.id } }),
      getApplications({ data: { page: 1, pageSize: FETCH_ALL_PAGE_SIZE } }),
    ]);
    return { entry, applications: appsResult.items };
  },
  component: EditQA,
});

function EditQA() {
  const { entry, applications } = Route.useLoaderData();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground tracking-tight">Edit Q&A</h1>
      <QAForm
        defaultValues={entry}
        applications={applications}
        hideApplicationSelect
        submitLabel="Save Changes"
        onSubmit={async (data) => {
          await updateQAEntry({
            data: { id: entry.id, question: data.question, answer: data.answer, tags: data.tags },
          });
          navigate({ to: "/qa/$id", params: { id: entry.id } });
        }}
      />
    </div>
  );
}
