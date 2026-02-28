import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ApplicationForm } from "~/components/ApplicationForm";
import { createApplication } from "~/server/functions/applications";

export const Route = createFileRoute("/applications/new")({
  component: NewApplication,
});

function NewApplication() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground tracking-tight">New Application</h1>
      <ApplicationForm
        submitLabel="Create Application"
        onSubmit={async (data) => {
          const app = await createApplication({ data });
          navigate({ to: "/applications/$id", params: { id: app.id } });
        }}
      />
    </div>
  );
}
