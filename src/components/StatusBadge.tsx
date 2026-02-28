const statusConfig: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-muted text-muted-foreground border border-border",
  },
  applied: {
    label: "Applied",
    className: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  screening: {
    label: "Screening",
    className: "bg-violet-50 text-violet-700 border border-violet-200",
  },
  interviewing: {
    label: "Interviewing",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  offer: {
    label: "Offer",
    className: "bg-primary/10 text-primary border border-primary/25",
  },
  accepted: {
    label: "Accepted",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  rejected: {
    label: "Rejected",
    className: "bg-destructive/10 text-destructive border border-destructive/25",
  },
  withdrawn: {
    label: "Withdrawn",
    className: "bg-muted text-muted-foreground border border-border",
  },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.draft;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
