import { Link, useRouter } from "@tanstack/react-router";
import { Download, FileText, Loader2, Unlink, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getCVDownloadUrl, unlinkCVFromApplication, uploadAndLinkCV } from "~/server/functions/cv";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

interface CVItem {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  extracted_text: string | null;
  created_at: string;
}

interface CVPreviewPanelProps {
  applicationId?: string;
  linkedCVs?: CVItem[];
}

export function CVPreviewPanel({ applicationId, linkedCVs = [] }: CVPreviewPanelProps) {
  const router = useRouter();
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleDownload(cvId: string) {
    const { url } = await getCVDownloadUrl({ data: { id: cvId } });
    window.open(url, "_blank");
  }

  async function handleUnlink(cvId: string) {
    if (!applicationId) return;
    await unlinkCVFromApplication({ data: { cvId, applicationId } });
    router.invalidate();
  }

  function validateFile(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Only PDF and DOCX files are supported.";
    }
    if (file.size > MAX_SIZE) {
      return "File size must be under 10MB.";
    }
    return null;
  }

  function handleFileSelect(file: File) {
    const error = validateFile(file);
    if (error) {
      setUploadError(error);
      return;
    }
    setSelectedFile(file);
    setUploadError(null);
    if (!fileName) {
      setFileName(file.name.replace(/\.[^.]+$/, ""));
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }

  async function handleUpload() {
    if (!selectedFile || !fileName.trim() || !applicationId) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", fileName.trim());
      formData.append("applicationId", applicationId);
      await uploadAndLinkCV({ data: formData });
      setShowUpload(false);
      setSelectedFile(null);
      setFileName("");
      router.invalidate();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function resetUpload() {
    setShowUpload(false);
    setSelectedFile(null);
    setFileName("");
    setUploadError(null);
  }

  const uploadForm =
    applicationId &&
    (!showUpload ? (
      <button
        type="button"
        onClick={() => setShowUpload(true)}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:border-ring/50 hover:text-foreground transition-colors"
      >
        <Upload className="size-3" />
        Upload CV
      </button>
    ) : (
      <div className="mt-4 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
        {/* Drop zone / file picker */}
        {/* biome-ignore lint/a11y/useSemanticElements: drop zone with drag-and-drop is not a button */}
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center rounded-md border-2 border-dashed p-4 text-center transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : selectedFile
                ? "border-primary/30 bg-primary/5"
                : "border-border hover:border-ring/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
          {selectedFile ? (
            <p className="text-xs font-medium text-foreground truncate max-w-full">
              {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
            </p>
          ) : (
            <>
              <Upload className="mb-1 size-5 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">Drop PDF/DOCX or click to browse</p>
            </>
          )}
        </div>

        {/* Name field */}
        <input
          type="text"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          placeholder="CV name..."
          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
        />

        {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || !fileName.trim() || uploading}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Upload className="size-3" />
            )}
            {uploading ? "Uploading..." : "Upload & Link"}
          </button>
          <button
            type="button"
            onClick={resetUpload}
            disabled={uploading}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    ));

  if (linkedCVs.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 sticky top-6">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          CV Preview
        </h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="mb-3 size-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No CV linked yet</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Link a CV from the{" "}
            <Link to="/cv" className="text-primary hover:text-primary/80 transition-colors">
              CV Manager
            </Link>{" "}
            to see it here.
          </p>
        </div>
        {uploadForm}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 sticky top-6">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Linked CVs ({linkedCVs.length})
      </h3>
      <div className="space-y-4">
        {linkedCVs.map((cv) => (
          <div key={cv.id} className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-1.5">
                <FileText className="size-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  to="/cv/$id"
                  params={{ id: cv.id }}
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
                >
                  {cv.name}
                </Link>
                <div className="mt-0.5 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {cv.file_type === "application/pdf" ? "PDF" : "DOCX"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {(cv.file_size / 1024).toFixed(0)} KB
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => handleDownload(cv.id)}
                className="flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              >
                <Download className="size-3" />
                Download
              </button>
              {applicationId && (
                <button
                  type="button"
                  onClick={() => handleUnlink(cv.id)}
                  className="flex items-center gap-1 rounded-md border border-destructive/50 bg-card px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Unlink className="size-3" />
                  Unlink
                </button>
              )}
            </div>

            {cv.extracted_text && (
              <div className="max-h-48 overflow-y-auto rounded-md bg-muted/50 p-3 text-xs font-mono leading-relaxed text-muted-foreground">
                {cv.extracted_text.slice(0, 500)}
                {cv.extracted_text.length > 500 && "..."}
              </div>
            )}
          </div>
        ))}
      </div>
      {uploadForm}
    </div>
  );
}
