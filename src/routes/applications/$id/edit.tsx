import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ApplicationForm } from "~/components/ApplicationForm";
import { getApplication, updateApplication } from "~/server/functions/applications";

export const Route = createFileRoute("/applications/$id/edit")({
  loader: async ({ params }) => {
    return getApplication({ data: { id: params.id } });
  },
  component: EditApplication,
});

function EditApplication() {
  const app = Route.useLoaderData();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground tracking-tight">Edit Application</h1>
      <ApplicationForm
        defaultValues={app}
        submitLabel="Save Changes"
        onSubmit={async (data) => {
          await updateApplication({ data: { id: app.id, ...data } });
          navigate({ to: "/applications/$id", params: { id: app.id } });
        }}
      />
    </div>
  );
}
