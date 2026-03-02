import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Plus, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getCVFiles, type SerializedCVFile } from "~/server/functions/cv";

export const Route = createFileRoute("/cv/")({
  loader: async () => {
    const cvFiles = (await getCVFiles({ data: {} })) as SerializedCVFile[];
    return { cvFiles };
  },
  component: CVList,
});

function CVList() {
  const { cvFiles } = Route.useLoaderData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">CV Manager</h1>
        <Link
          to="/cv/upload"
          search={{ parent: "" }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Upload className="size-4" />
            Upload CV
          </span>
        </Link>
      </div>

      {cvFiles.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <FileText className="mx-auto mb-3 size-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No CVs uploaded yet</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Upload your first CV to get started with version management.
          </p>
          <Link
            to="/cv/upload"
            search={{ parent: "" }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" />
            Upload CV
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cvFiles.map((cv) => (
            <Link
              key={cv.id}
              to="/cv/$id"
              params={{ id: cv.id }}
              className="group rounded-lg border border-border bg-card p-5 shadow-sm hover:border-ring/30 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-primary/10 p-2">
                  <FileText className="size-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {cv.name}
                  </h3>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {cv.file_type === "application/pdf" ? "PDF" : "DOCX"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {(cv.file_size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{new Date(cv.created_at).toLocaleDateString()}</span>
                {cv.variant_count > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {cv.variant_count} variant
                    {cv.variant_count !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>

              {cv.extracted_text && (
                <p className="mt-2 text-xs text-muted-foreground/70 line-clamp-2">
                  {cv.extracted_text.slice(0, 150)}...
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
