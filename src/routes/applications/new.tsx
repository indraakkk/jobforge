import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ApplicationForm } from "~/components/ApplicationForm";
import { JobImportForm } from "~/components/JobImportForm";
import { createApplication } from "~/server/functions/applications";

export const Route = createFileRoute("/applications/new")({
  component: NewApplication,
});

function NewApplication() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"automated" | "manual">("automated");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground tracking-tight">New Application</h1>

      <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
        <button
          type="button"
          onClick={() => setMode("automated")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            mode === "automated"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          Automated
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            mode === "manual"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          Manual
        </button>
      </div>

      {mode === "automated" ? (
        <JobImportForm />
      ) : (
        <ApplicationForm
          submitLabel="Create Application"
          onSubmit={async (data) => {
            const app = await createApplication({ data });
            navigate({ to: "/applications/$id", params: { id: app.id } });
          }}
        />
      )}
    </div>
  );
}
