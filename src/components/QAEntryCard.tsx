import { Check, Copy, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "~/components/ConfirmDeleteDialog";

interface QAEntryData {
  id: string;
  application_id: string;
  question: string;
  answer: string;
  tags: readonly string[];
}

interface Props {
  entry: QAEntryData;
  applicationName?: string;
  showAppLink?: boolean;
  onSave?: (id: string, answer: string, tags: string[]) => Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
}

const inputBase =
  "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition-colors";

const inputClass = `${inputBase} resize-y`;

export function QAEntryCard({ entry, applicationName, showAppLink, onSave, onDelete }: Props) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.answer);
  const [draftTags, setDraftTags] = useState(entry.tags.join(", "));
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(entry.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSave() {
    if (!onSave) return;
    setSaving(true);
    const tags = draftTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    await onSave(entry.id, draft, tags);
    setSaving(false);
    setEditing(false);
  }

  function handleCancel() {
    setDraft(entry.answer);
    setDraftTags(entry.tags.join(", "));
    setEditing(false);
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      {showAppLink && applicationName && (
        <div className="text-xs text-muted-foreground/60">{applicationName}</div>
      )}

      <div>
        <p className="text-sm font-medium text-foreground">Q: {entry.question}</p>

        {editing ? (
          <div className="mt-2 space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type your answer..."
              rows={4}
              className={inputClass}
            />
            <input
              value={draftTags}
              onChange={(e) => setDraftTags(e.target.value)}
              placeholder="Tags (comma-separated, e.g. behavioral, technical)"
              className={inputBase}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : entry.answer ? (
          <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-wrap">
            A: {entry.answer}
          </p>
        ) : (
          <button
            type="button"
            className="mt-1.5 text-sm text-muted-foreground/50 italic hover:text-muted-foreground transition-colors"
            onClick={() => {
              setDraft("");
              setEditing(true);
            }}
          >
            No answer yet — click to add one
          </button>
        )}
      </div>

      {!editing && (
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {entry.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex gap-1">
            {entry.answer && (
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Copy answer"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </button>
            )}
            {onSave && (
              <button
                type="button"
                onClick={() => {
                  setDraft(entry.answer);
                  setEditing(true);
                }}
                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Edit answer"
              >
                <Pencil className="size-3.5" />
              </button>
            )}
            {onDelete && (
              <>
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="size-3.5" />
                </button>
                <ConfirmDeleteDialog
                  open={deleteOpen}
                  onOpenChange={setDeleteOpen}
                  title="Delete this Q&A entry?"
                  description="This action cannot be undone."
                  loading={deleteLoading}
                  onConfirm={async () => {
                    setDeleteLoading(true);
                    try {
                      await onDelete(entry.id);
                      setDeleteOpen(false);
                    } finally {
                      setDeleteLoading(false);
                    }
                  }}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
