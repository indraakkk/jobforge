import { FileText } from "lucide-react";

export function CVPreviewPanel() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 sticky top-6">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        CV Preview
      </h3>
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="mb-3 size-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No CV uploaded yet</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Upload your CV in the CV Manager to see it here as reference.
        </p>
      </div>
    </div>
  );
}
