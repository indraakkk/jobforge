import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Download,
  FileText,
  Link2,
  Trash2,
  Unlink,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "~/components/ConfirmDeleteDialog";
import { FETCH_ALL_PAGE_SIZE } from "~/lib/schemas/common";
import { getApplications } from "~/server/functions/applications";
import {
  deleteCV,
  getApplicationsByCV,
  getCVDownloadUrl,
  getCVFile,
  getCVVariantsWithApplications,
  linkCVToApplication,
  type SerializedCVFile,
  setCVActive,
  unlinkCVFromApplication,
  type VariantWithApplications,
} from "~/server/functions/cv";

export const Route = createFileRoute("/cv/$id/")({
  loader: async ({ params }) => {
    const [cv, applications, linkedApps] = await Promise.all([
      getCVFile({ data: { id: params.id } }) as Promise<SerializedCVFile>,
      getApplications({ data: { page: 1, pageSize: FETCH_ALL_PAGE_SIZE } }),
      getApplicationsByCV({ data: { cvId: params.id } }) as Promise<
        Array<{ id: string; company: string; role: string }>
      >,
    ]);

    // If this is a base CV, load variants with their linked applications
    let variants: VariantWithApplications[] = [];
    if (cv.is_base) {
      variants = (await getCVVariantsWithApplications({
        data: { parentId: params.id },
      })) as VariantWithApplications[];
    }

    return { cv, variants, applications: applications.items, linkedApps };
  },
  component: CVDetail,
});

// Simple line-level diff: returns tokens with added/removed/unchanged markers
function computeDiff(
  base: string,
  variant: string,
): Array<{ text: string; type: "added" | "removed" | "unchanged" }> {
  const baseLines = base.split("\n");
  const variantLines = variant.split("\n");

  // Build a simple LCS-based diff
  const result: Array<{ text: string; type: "added" | "removed" | "unchanged" }> = [];

  // Simple greedy approach: for each line in variant, check if it exists in base
  const baseSet = new Set(baseLines.map((l) => l.trim()).filter(Boolean));
  const variantSet = new Set(variantLines.map((l) => l.trim()).filter(Boolean));

  for (const line of baseLines) {
    if (!line.trim()) continue;
    if (!variantSet.has(line.trim())) {
      result.push({ text: line, type: "removed" });
    }
  }

  for (const line of variantLines) {
    if (!line.trim()) continue;
    if (!baseSet.has(line.trim())) {
      result.push({ text: line, type: "added" });
    } else {
      result.push({ text: line, type: "unchanged" });
    }
  }

  return result;
}

// Side-by-side diff view component
function DiffView({
  baseText,
  variantText,
  baseName,
  variantName,
  onClose,
}: {
  baseText: string;
  variantText: string;
  baseName: string;
  variantName: string;
  onClose: () => void;
}) {
  const baseLines = baseText.split("\n");
  const variantLines = variantText.split("\n");

  // Build a proper LCS diff for side-by-side display
  // We'll align lines using a simple approach
  const maxLines = Math.max(baseLines.length, variantLines.length);
  const pairs: Array<{
    base: string | null;
    variant: string | null;
    status: "same" | "changed" | "added" | "removed";
  }> = [];

  // Build sets for quick lookup
  const baseLineSet = new Map<string, number[]>();
  for (let i = 0; i < baseLines.length; i++) {
    const trimmed = baseLines[i].trim();
    if (!baseLineSet.has(trimmed)) baseLineSet.set(trimmed, []);
    baseLineSet.get(trimmed)!.push(i);
  }

  // Simple sequential diff: walk both arrays
  let bi = 0;
  let vi = 0;
  while (bi < baseLines.length || vi < variantLines.length) {
    const baseLine = bi < baseLines.length ? baseLines[bi] : null;
    const variantLine = vi < variantLines.length ? variantLines[vi] : null;

    if (baseLine === null) {
      pairs.push({ base: null, variant: variantLine, status: "added" });
      vi++;
    } else if (variantLine === null) {
      pairs.push({ base: baseLine, variant: null, status: "removed" });
      bi++;
    } else if (baseLine.trim() === variantLine.trim()) {
      pairs.push({ base: baseLine, variant: variantLine, status: "same" });
      bi++;
      vi++;
    } else {
      // Check if variant line appears soon in base (skip base lines = removed)
      const variantInBase = baseLineSet.get(variantLine.trim());
      const baseInVariant = variantLines
        .slice(vi + 1, vi + 5)
        .some((l) => l.trim() === baseLine.trim());

      if (variantInBase && variantInBase.some((idx) => idx > bi && idx < bi + 5)) {
        // base line was removed
        pairs.push({ base: baseLine, variant: null, status: "removed" });
        bi++;
      } else if (baseInVariant) {
        // variant line was added
        pairs.push({ base: null, variant: variantLine, status: "added" });
        vi++;
      } else {
        // lines changed
        pairs.push({ base: baseLine, variant: variantLine, status: "changed" });
        bi++;
        vi++;
      }
    }
  }

  // Filter to only show changed/added/removed lines with context (3 lines around)
  const changedIndices = new Set<number>();
  pairs.forEach((p, i) => {
    if (p.status !== "same") {
      for (let c = Math.max(0, i - 3); c <= Math.min(pairs.length - 1, i + 3); c++) {
        changedIndices.add(c);
      }
    }
  });

  const displayPairs =
    changedIndices.size > 0
      ? pairs.map((p, i) => ({ ...p, idx: i })).filter((p) => changedIndices.has(p.idx))
      : pairs.slice(0, 100); // fallback: show first 100 lines if identical

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-6xl max-h-[90vh] flex flex-col rounded-xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="size-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Side-by-Side Comparison</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground border border-border hover:bg-accent transition-colors"
          >
            Close
          </button>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-2 gap-0 border-b border-border">
          <div className="border-r border-border px-4 py-2 bg-red-50 dark:bg-red-950/20">
            <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider truncate">
              Base: {baseName}
            </p>
          </div>
          <div className="px-4 py-2 bg-green-50 dark:bg-green-950/20">
            <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider truncate">
              Variant: {variantName}
            </p>
          </div>
        </div>

        {/* Diff content */}
        <div className="flex-1 overflow-y-auto">
          {!variantText ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              This variant has no extracted text available for comparison.
            </div>
          ) : displayPairs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No differences found - the texts are identical.
            </div>
          ) : (
            <div className="font-mono text-xs">
              {displayPairs.map((pair, i) => {
                const isRemoved = pair.status === "removed" || pair.status === "changed";
                const isAdded = pair.status === "added" || pair.status === "changed";
                const isSame = pair.status === "same";

                return (
                  <div key={`diff-${i}-${pair.status}`} className="grid grid-cols-2">
                    {/* Base side */}
                    <div
                      className={`border-r border-border px-3 py-0.5 whitespace-pre-wrap break-all ${
                        isSame
                          ? "bg-background text-foreground/70"
                          : isRemoved
                            ? "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300"
                            : "bg-background text-transparent select-none"
                      }`}
                    >
                      {isSame || isRemoved ? (pair.base ?? "") : "\u00a0"}
                    </div>
                    {/* Variant side */}
                    <div
                      className={`px-3 py-0.5 whitespace-pre-wrap break-all ${
                        isSame
                          ? "bg-background text-foreground/70"
                          : isAdded
                            ? "bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300"
                            : "bg-background text-transparent select-none"
                      }`}
                    >
                      {isSame || isAdded ? (pair.variant ?? "") : "\u00a0"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stats footer */}
        <div className="border-t border-border px-6 py-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            <span className="text-red-600 dark:text-red-400 font-medium">
              -{pairs.filter((p) => p.status === "removed" || p.status === "changed").length}
            </span>{" "}
            removed/changed lines
          </span>
          <span>
            <span className="text-green-600 dark:text-green-400 font-medium">
              +{pairs.filter((p) => p.status === "added" || p.status === "changed").length}
            </span>{" "}
            added/changed lines
          </span>
          <span>{pairs.filter((p) => p.status === "same").length} unchanged lines</span>
        </div>
      </div>
    </div>
  );
}

// Variant card component
function VariantCard({
  variant,
  baseCV,
  onCompare,
}: {
  variant: VariantWithApplications;
  baseCV: SerializedCVFile;
  onCompare: (variant: VariantWithApplications) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Card header */}
      <div className="flex items-start gap-3 p-3">
        <div className="mt-0.5 rounded bg-primary/10 p-1.5">
          <FileText className="size-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/cv/$id"
              params={{ id: variant.id }}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate"
            >
              {variant.name}
            </Link>
            <Badge variant="outline" className="text-xs shrink-0">
              v{variant.version}
            </Badge>
          </div>

          {/* Target company/role */}
          {(variant.target_company || variant.target_role) && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {[variant.target_company, variant.target_role].filter(Boolean).join(" - ")}
            </p>
          )}

          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(variant.created_at).toLocaleDateString()}
            {variant.linked_applications.length > 0 && (
              <span>
                {" "}
                &middot;{" "}
                <span className="text-primary">
                  {variant.linked_applications.length} app
                  {variant.linked_applications.length !== 1 ? "s" : ""}
                </span>
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Compare button */}
          {baseCV.extracted_text && (
            <button
              type="button"
              onClick={() => onCompare(variant)}
              title="Compare with base"
              className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              <ArrowLeftRight className="size-3" />
              Compare
            </button>
          )}

          {/* Expand toggle */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent transition-colors"
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border bg-muted/30 px-4 py-3 space-y-3">
          {/* Tailoring notes */}
          {variant.tailoring_notes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Tailoring Notes
              </p>
              <p className="text-xs text-foreground whitespace-pre-wrap">
                {variant.tailoring_notes}
              </p>
            </div>
          )}

          {/* Target job description (truncated) */}
          {variant.target_job_description && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Target Job Description
              </p>
              <p className="text-xs text-muted-foreground line-clamp-4">
                {variant.target_job_description}
              </p>
            </div>
          )}

          {/* Linked applications */}
          {variant.linked_applications.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Linked Applications
              </p>
              <div className="space-y-1">
                {variant.linked_applications.map((app) => (
                  <Link
                    key={app.id}
                    to="/applications/$id"
                    params={{ id: app.id }}
                    className="flex items-center gap-1.5 text-xs text-foreground hover:text-primary transition-colors"
                  >
                    <Building2 className="size-3 text-muted-foreground" />
                    <span className="font-medium">{app.company}</span>
                    <span className="text-muted-foreground">- {app.role}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* No metadata case */}
          {!variant.tailoring_notes &&
            !variant.target_job_description &&
            variant.linked_applications.length === 0 && (
              <p className="text-xs text-muted-foreground">No additional details.</p>
            )}
        </div>
      )}
    </div>
  );
}

function CVDetail() {
  const { cv, variants, applications, linkedApps } = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [linkAppId, setLinkAppId] = useState("");
  const [settingActive, setSettingActive] = useState(false);
  const [compareVariant, setCompareVariant] = useState<VariantWithApplications | null>(null);

  const linkedAppIds = new Set(linkedApps.map((a) => a.id));
  const availableApps = applications.filter((a) => !linkedAppIds.has(a.id));

  async function handleDownload() {
    const { url } = await getCVDownloadUrl({ data: { id: cv.id } });
    window.open(url, "_blank");
  }

  async function handleLink() {
    if (!linkAppId) return;
    await linkCVToApplication({ data: { cvId: cv.id, applicationId: linkAppId } });
    setLinkAppId("");
    router.invalidate();
  }

  async function handleUnlink(applicationId: string) {
    await unlinkCVFromApplication({ data: { cvId: cv.id, applicationId } });
    router.invalidate();
  }

  async function handleSetActive() {
    setSettingActive(true);
    try {
      await setCVActive({ data: { id: cv.id } });
      router.invalidate();
    } finally {
      setSettingActive(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Diff comparison modal */}
      {compareVariant && cv.extracted_text && (
        <DiffView
          baseText={cv.extracted_text}
          variantText={compareVariant.extracted_text ?? ""}
          baseName={cv.name}
          variantName={compareVariant.name}
          onClose={() => setCompareVariant(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/cv"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              CV Manager
            </Link>
            <span className="text-muted-foreground/50">/</span>
            {cv.parent_id && (
              <>
                <Link
                  to="/cv/$id"
                  params={{ id: cv.parent_id }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Base CV
                </Link>
                <span className="text-muted-foreground/50">/</span>
              </>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-bold text-foreground tracking-tight">{cv.name}</h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{cv.file_type === "application/pdf" ? "PDF" : "DOCX"}</Badge>
            <span className="text-sm text-muted-foreground">
              {(cv.file_size / 1024).toFixed(0)} KB
            </span>
            {cv.is_base ? (
              <Badge variant="default">Base</Badge>
            ) : (
              <Badge variant="outline">Variant v{cv.version}</Badge>
            )}
            {cv.is_base && cv.is_active && (
              <Badge
                variant="outline"
                className="border-green-500/50 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20"
              >
                <CheckCircle2 className="size-3 mr-1" />
                Active
              </Badge>
            )}
            {/* Target info for variants */}
            {!cv.is_base && (cv.target_company || cv.target_role) && (
              <span className="text-sm text-muted-foreground">
                {[cv.target_company, cv.target_role].filter(Boolean).join(" - ")}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {cv.is_base && !cv.is_active && (
            <button
              type="button"
              onClick={handleSetActive}
              disabled={settingActive}
              className="flex items-center gap-1.5 rounded-md border border-green-500/50 bg-card px-4 py-2 text-sm font-medium text-green-600 dark:text-green-400 shadow-sm hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors disabled:opacity-50"
            >
              <Circle className="size-4" />
              Set Active
            </button>
          )}
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent transition-colors"
          >
            <Download className="size-4" />
            Download
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            disabled={deleting}
            className="rounded-md border border-destructive/50 bg-card px-4 py-2 text-sm font-medium text-destructive shadow-sm hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            <Trash2 className="size-4" />
          </button>
          <ConfirmDeleteDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title="Delete this CV?"
            description={
              cv.is_base && variants.length > 0
                ? `This will also delete ${variants.length} variant(s). This cannot be undone.`
                : "This will permanently delete the CV file. This cannot be undone."
            }
            loading={deleting}
            onConfirm={async () => {
              setDeleting(true);
              try {
                await deleteCV({ data: { id: cv.id } });
                navigate({ to: "/cv" });
              } finally {
                setDeleting(false);
              }
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Text preview + Details */}
        <div className="space-y-6">
          {/* Tailoring info for variants */}
          {!cv.is_base && (cv.tailoring_notes || cv.target_job_description) && (
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tailoring Details
              </h2>
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                {cv.tailoring_notes && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Notes
                    </p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {cv.tailoring_notes}
                    </p>
                  </div>
                )}
                {cv.target_job_description && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Target Job Description
                    </p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">
                      {cv.target_job_description}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Extracted Text
            </h2>
            {cv.extracted_text ? (
              <div className="max-h-[600px] overflow-y-auto rounded-lg border border-border bg-card p-4 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                {cv.extracted_text}
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Text extraction was not available for this file.
                </p>
              </div>
            )}
          </section>

          {/* Metadata */}
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Details
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <DetailCard label="File Key">
                <span className="font-mono text-xs break-all">{cv.file_key}</span>
              </DetailCard>
              <DetailCard label="Uploaded">
                <span className="font-mono">{new Date(cv.created_at).toLocaleDateString()}</span>
              </DetailCard>
              {cv.parent_id && (
                <DetailCard label="Parent CV">
                  <Link
                    to="/cv/$id"
                    params={{ id: cv.parent_id }}
                    className="text-primary hover:text-primary/80 transition-colors"
                  >
                    View base CV
                  </Link>
                </DetailCard>
              )}
            </div>
          </section>
        </div>

        {/* Right: Variants tree + Application links */}
        <div className="space-y-6">
          {/* Variants tree (only for base CVs) */}
          {cv.is_base && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Variants ({variants.length})
                </h2>
                <Link
                  to="/cv/upload"
                  search={{ parent: cv.id }}
                  className="flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                >
                  <Upload className="size-3" />
                  Upload Variant
                </Link>
              </div>

              {variants.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-6 text-center">
                  <p className="text-sm text-muted-foreground">No variants yet</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    Create tailored versions of this CV for specific applications.
                  </p>
                </div>
              ) : (
                <div className="relative space-y-2 pl-4">
                  {/* Vertical tree line */}
                  <div className="absolute left-1.5 top-0 bottom-0 w-px bg-border" />

                  {variants.map((v) => (
                    <div key={v.id} className="relative">
                      {/* Horizontal connector */}
                      <div className="absolute -left-2.5 top-4 w-3 h-px bg-border" />
                      <VariantCard variant={v} baseCV={cv} onCompare={setCompareVariant} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Linked Applications */}
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Linked Applications ({linkedApps.length})
            </h2>
            {linkedApps.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">No applications linked</p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Use the dropdown below to link this CV to an application.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {linkedApps.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <Building2 className="size-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Link
                        to="/applications/$id"
                        params={{ id: app.id }}
                        className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
                      >
                        {app.company}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate">{app.role}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnlink(app.id)}
                      className="flex items-center gap-1 rounded-md border border-destructive/50 bg-card px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    >
                      <Unlink className="size-3" />
                      Unlink
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Link to Application */}
          {availableApps.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Link to Application
              </h2>
              <div className="flex gap-2">
                <select
                  value={linkAppId}
                  onChange={(e) => setLinkAppId(e.target.value)}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                >
                  <option value="">Select application...</option>
                  {availableApps.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.company} - {app.role}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleLink}
                  disabled={!linkAppId}
                  className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Link2 className="size-4" />
                  Link
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}
