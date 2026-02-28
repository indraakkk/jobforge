const steps = [
  { key: "draft", label: "Draft" },
  { key: "applied", label: "Applied" },
  { key: "screening", label: "Screening" },
  { key: "interviewing", label: "Interviewing" },
  { key: "offer", label: "Offer" },
  { key: "accepted", label: "Accepted" },
] as const;

const terminalStatuses = ["rejected", "withdrawn"] as const;

export function StatusPipeline({ status }: { status: string }) {
  const isTerminal = (terminalStatuses as readonly string[]).includes(status);
  const currentIndex = steps.findIndex((s) => s.key === status);

  return (
    <div className="w-full">
      {isTerminal ? (
        <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3 border border-border">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              status === "rejected" ? "bg-destructive" : "bg-muted-foreground"
            }`}
          />
          <span className="text-sm font-medium text-muted-foreground">
            {status === "rejected" ? "Rejected" : "Withdrawn"}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          {steps.map((step, i) => {
            const isCompleted = i < currentIndex;
            const isCurrent = i === currentIndex;
            return (
              <div key={step.key} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`h-1.5 w-full rounded-full transition-colors ${
                    isCompleted ? "bg-emerald-500" : isCurrent ? "bg-primary" : "bg-border"
                  }`}
                />
                <span
                  className={`text-xs ${
                    isCurrent
                      ? "font-semibold text-primary"
                      : isCompleted
                        ? "text-emerald-600"
                        : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
