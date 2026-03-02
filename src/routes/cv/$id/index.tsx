import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Building2, Download, FileText, Link2, Trash2, Unlink, Upload } from "lucide-react";
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
  getCVFiles,
  linkCVToApplication,
  type SerializedCVFile,
  unlinkCVFromApplication,
} from "~/server/functions/cv";

export const Route = createFileRoute("/cv/$id/")({
  loader: async ({ params }) => {
    const [cv, variants, applications, linkedApps] = await Promise.all([
      getCVFile({ data: { id: params.id } }) as Promise<SerializedCVFile>,
      getCVFiles({ data: { parentId: params.id } }) as Promise<SerializedCVFile[]>,
      getApplications({ data: { page: 1, pageSize: FETCH_ALL_PAGE_SIZE } }),
      getApplicationsByCV({ data: { cvId: params.id } }) as Promise<
        Array<{ id: string; company: string; role: string }>
      >,
    ]);
    return { cv, variants, applications: applications.items, linkedApps };
  },
  component: CVDetail,
});

function CVDetail() {
  const { cv, variants, applications, linkedApps } = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [linkAppId, setLinkAppId] = useState("");

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

  return (
    <div className="space-y-6">
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
          </div>
          <h1 className="mt-1 text-2xl font-bold text-foreground tracking-tight">{cv.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="secondary">{cv.file_type === "application/pdf" ? "PDF" : "DOCX"}</Badge>
            <span className="text-sm text-muted-foreground">
              {(cv.file_size / 1024).toFixed(0)} KB
            </span>
            {cv.is_base ? (
              <Badge variant="default">Base</Badge>
            ) : (
              <Badge variant="outline">Variant v{cv.version}</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
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
        {/* Left: Text preview */}
        <div className="space-y-6">
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

        {/* Right: Variants + Application links */}
        <div className="space-y-6">
          {/* Variants (only for base CVs) */}
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
                  New Variant
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
                <div className="space-y-2">
                  {variants.map((v) => (
                    <Link
                      key={v.id}
                      to="/cv/$id"
                      params={{ id: v.id }}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-ring/30 transition-colors"
                    >
                      <FileText className="size-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{v.name}</p>
                        <p className="text-xs text-muted-foreground">
                          v{v.version} &middot; {new Date(v.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </Link>
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
                      {app.company} — {app.role}
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
