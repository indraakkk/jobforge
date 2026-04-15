import { Link, useRouter } from "@tanstack/react-router";
import { Download, FileText, Link2, Loader2, Unlink, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  getCVDownloadUrl,
  getCVFileData,
  getCVFiles,
  linkCVToApplication,
  unlinkCVFromApplication,
  uploadAndLinkCV,
  type SerializedCVFile,
} from "~/server/functions/cv";

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

export function CVPreviewPanel({
  applicationId,
  linkedCVs = [],
}: CVPreviewPanelProps) {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showLinkExisting, setShowLinkExisting] = useState(false);
  const [allCVs, setAllCVs] = useState<SerializedCVFile[]>([]);
  const [linkCVId, setLinkCVId] = useState("");
  const [linking, setLinking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedCV = linkedCVs[selectedIndex] ?? null;
  const selectedCVId = selectedCV?.id;
  const isPdf = selectedCV?.file_type === "application/pdf";

  // Reset selection when CV list changes
  useEffect(() => {
    if (selectedIndex >= linkedCVs.length) {
      setSelectedIndex(0);
    }
  }, [linkedCVs.length, selectedIndex]);

  // Fetch PDF bytes via server function, create blob URL
  useEffect(() => {
    let cancelled = false;
    let blobUrl: string | null = null;

    setPdfUrl(null);
    if (!selectedCVId || !isPdf) {
      setPdfLoading(false);
      return;
    }
    setPdfLoading(true);
    getCVFileData({ data: { id: selectedCVId } })
      .then(({ data, contentType }) => {
        if (cancelled) return;
        const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: contentType });
        blobUrl = URL.createObjectURL(blob);
        setPdfUrl(blobUrl);
      })
      .catch((err) => {
        console.error("Failed to load PDF:", err);
        if (!cancelled) setPdfUrl(null);
      })
      .finally(() => {
        if (!cancelled) setPdfLoading(false);
      });
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [selectedCVId, isPdf]);

  async function handleShowLinkExisting() {
    setShowLinkExisting(true);
    try {
      const bases = await getCVFiles({ data: {} }) as SerializedCVFile[];
      // For each base that has variants, fetch them too
      const variantResults = await Promise.all(
        bases
          .filter((cv) => (cv as SerializedCVFile & { variant_count: number }).variant_count > 0)
          .map((cv) => getCVFiles({ data: { parentId: cv.id } }) as Promise<SerializedCVFile[]>),
      );
      const allVariants = variantResults.flat();
      setAllCVs([...bases, ...allVariants]);
    } catch (err) {
      console.error("Failed to load CVs:", err);
    }
  }

  async function handleLinkExisting() {
    if (!linkCVId || !applicationId) return;
    setLinking(true);
    try {
      await linkCVToApplication({ data: { cvId: linkCVId, applicationId } });
      setShowLinkExisting(false);
      setLinkCVId("");
      router.invalidate();
    } catch (err) {
      console.error("Failed to link CV:", err);
    } finally {
      setLinking(false);
    }
  }

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

  // Filter out already-linked CVs from the dropdown
  const linkedCVIds = new Set(linkedCVs.map((cv) => cv.id));
  const availableCVs = allCVs.filter((cv) => !linkedCVIds.has(cv.id));

  // Link existing CV form (reused in both empty and viewer states)
  const linkExistingButton = applicationId && !showLinkExisting && !showUpload && (
    <button
      type="button"
      onClick={handleShowLinkExisting}
      className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:border-ring/50 hover:text-foreground transition-colors"
    >
      <Link2 className="size-3" />
      Link existing CV
    </button>
  );

  const linkExistingForm = applicationId && showLinkExisting && (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
      <select
        value={linkCVId}
        onChange={(e) => setLinkCVId(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
      >
        <option value="">Select a CV...</option>
        {availableCVs.map((cv) => (
          <option key={cv.id} value={cv.id}>
            {cv.parent_id ? `↳ ${cv.name}` : cv.name}
            {cv.target_role ? ` (${cv.target_role})` : ""}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleLinkExisting}
          disabled={!linkCVId || linking}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {linking ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Link2 className="size-3" />
          )}
          {linking ? "Linking..." : "Link"}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowLinkExisting(false);
            setLinkCVId("");
          }}
          disabled={linking}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  // Upload form (reused in both empty and viewer states)
  const uploadButton = applicationId && !showUpload && !showLinkExisting && (
    <button
      type="button"
      onClick={() => setShowUpload(true)}
      className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:border-ring/50 hover:text-foreground transition-colors"
    >
      <Upload className="size-3" />
      Upload CV
    </button>
  );

  const uploadForm = applicationId && showUpload && (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
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
            <p className="text-xs text-muted-foreground">
              Drop PDF/DOCX or click to browse
            </p>
          </>
        )}
      </div>
      <input
        type="text"
        value={fileName}
        onChange={(e) => setFileName(e.target.value)}
        placeholder="CV name..."
        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
      />
      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
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
  );

  // Empty state — no linked CVs
  if (linkedCVs.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 sticky top-6">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          CV Preview
        </h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="mb-3 size-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            No CV linked yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Link a CV from the{" "}
            <Link
              to="/cv"
              className="text-primary hover:text-primary/80 transition-colors"
            >
              CV Manager
            </Link>{" "}
            to see it here.
          </p>
        </div>
        <div className="mt-4 space-y-2">
          {linkExistingButton}
          {linkExistingForm}
          {uploadButton}
          {uploadForm}
        </div>
      </div>
    );
  }

  // Viewer state — CVs linked, show inline preview
  return (
    <div
      className="rounded-lg border border-border bg-card sticky top-8 flex flex-col overflow-hidden"
      style={{ height: "calc(100vh - 2rem)" }}
    >
      {/* Header + CV tabs */}
      <div className="shrink-0 space-y-2 border-b border-border px-4 pt-4 pb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Linked CVs ({linkedCVs.length})
        </h3>
        {linkedCVs.length > 1 && (
          <div className="flex gap-1 overflow-x-auto">
            {linkedCVs.map((cv, i) => (
              <button
                key={cv.id}
                type="button"
                onClick={() => setSelectedIndex(i)}
                className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  i === selectedIndex
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {cv.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Document viewer (fills available space) */}
      <div className="flex-1 min-h-0 p-4">
        {isPdf ? (
          pdfLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="h-full w-full rounded-md border border-border"
              title={selectedCV.name}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Failed to load PDF preview
            </div>
          )
        ) : selectedCV?.extracted_text ? (
          <div className="h-full overflow-y-auto rounded-md bg-muted/50 p-3 text-xs font-mono leading-relaxed text-muted-foreground">
            {selectedCV.extracted_text}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <FileText className="mb-2 size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No preview available for DOCX
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Download the file to view it
            </p>
          </div>
        )}
      </div>

      {/* Footer: metadata + actions */}
      <div className="shrink-0 space-y-2 border-t border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {isPdf ? "PDF" : "DOCX"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {selectedCV ? (selectedCV.file_size / 1024).toFixed(0) : 0} KB
          </span>
          <Link
            to="/cv/$id"
            params={{ id: selectedCV?.id ?? "" }}
            className="ml-auto text-xs text-primary hover:text-primary/80 transition-colors"
          >
            View details
          </Link>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => selectedCV && handleDownload(selectedCV.id)}
            className="flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Download className="size-3" />
            Download
          </button>
          {applicationId && (
            <button
              type="button"
              onClick={() => selectedCV && handleUnlink(selectedCV.id)}
              className="flex items-center gap-1 rounded-md border border-destructive/50 bg-card px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Unlink className="size-3" />
              Unlink
            </button>
          )}
        </div>
        {linkExistingButton}
        {linkExistingForm}
        {uploadButton}
        {uploadForm}
      </div>
    </div>
  );
}
