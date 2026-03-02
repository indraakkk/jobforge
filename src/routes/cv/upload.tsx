import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileText, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { getCVFiles, type SerializedCVFile, uploadCV } from "~/server/functions/cv";

export const Route = createFileRoute("/cv/upload")({
  validateSearch: (search: Record<string, unknown>) => ({
    parent: (search.parent as string) ?? "",
  }),
  loader: async () => {
    const baseCVs = (await getCVFiles({ data: {} })) as SerializedCVFile[];
    return { baseCVs };
  },
  component: UploadCV,
});

function UploadCV() {
  const { baseCVs } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [parentId, setParentId] = useState(search.parent);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(selected.type)) {
      setError("Only PDF and DOCX files are allowed");
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError("File must be under 10MB");
      return;
    }

    setFile(selected);
    setError("");
    if (!name) {
      setName(selected.name.replace(/\.[^.]+$/, ""));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !name) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name);
      if (parentId) {
        formData.append("parent_id", parentId);
      }

      const result = (await uploadCV({ data: formData })) as SerializedCVFile;
      navigate({ to: "/cv/$id", params: { id: result.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground tracking-tight">Upload CV</h1>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
        {/* File drop zone */}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-foreground">File</span>
          {file ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
              <FileText className="size-8 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(0)} KB &middot;{" "}
                  {file.type === "application/pdf" ? "PDF" : "DOCX"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border bg-card/50 p-8 text-center hover:border-ring/30 hover:bg-card transition-all">
              <Upload className="size-8 text-muted-foreground/50" />
              <span className="text-sm font-medium text-muted-foreground">
                Click to upload PDF or DOCX
              </span>
              <span className="text-xs text-muted-foreground/60">Max 10MB</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Name */}
        <div>
          <label htmlFor="cv-name" className="mb-1.5 block text-sm font-medium text-foreground">
            Name
          </label>
          <input
            id="cv-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Senior Engineer CV 2026"
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
          />
        </div>

        {/* Parent CV (optional — for variants) */}
        {baseCVs.length > 0 && (
          <div>
            <label htmlFor="parent-cv" className="mb-1.5 block text-sm font-medium text-foreground">
              Base CV{" "}
              <span className="font-normal text-muted-foreground">
                (optional — creates variant)
              </span>
            </label>
            <select
              id="parent-cv"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
            >
              <option value="">None — upload as base CV</option>
              {baseCVs.map((cv) => (
                <option key={cv.id} value={cv.id}>
                  {cv.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={uploading || !file || !name}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/cv" })}
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
