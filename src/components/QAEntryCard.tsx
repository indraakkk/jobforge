import { Check, Copy, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface QAEntryData {
  id: string;
  application_id: string;
  question: string;
  answer: string;
  tags: string[];
}

interface Props {
  entry: QAEntryData;
  applicationName?: string;
  showAppLink?: boolean;
  onSave?: (id: string, answer: string) => Promise<void>;
  onDelete?: (id: string) => void;
}

const inputClass =
  "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition-colors resize-y";

export function QAEntryCard({ entry, applicationName, showAppLink, onSave, onDelete }: Props) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.answer);
  const [saving, setSaving] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(entry.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSave() {
    if (!onSave) return;
    setSaving(true);
    await onSave(entry.id, draft);
    setSaving(false);
    setEditing(false);
  }

  function handleCancel() {
    setDraft(entry.answer);
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
              <button
                type="button"
                onClick={() => onDelete(entry.id)}
                className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Delete"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
