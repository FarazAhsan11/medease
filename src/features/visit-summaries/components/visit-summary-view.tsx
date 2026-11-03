import { CalendarClockIcon } from "lucide-react";

import type { VisitSummary } from "@/features/visit-summaries/lib/visit-summaries";
import { formatDateKey } from "@/lib/datetime";

// A read-only summary, for the patient and for the doctor once it's closed.
export function VisitSummaryView({ summary }: { summary: VisitSummary }) {
  return (
    <div className="grid gap-3 text-sm">
      {summary.diagnosis && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Diagnosis</p>
          <p className="mt-0.5">{summary.diagnosis}</p>
        </div>
      )}
      {summary.advice && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Advice</p>
          <p className="mt-0.5 whitespace-pre-line">{summary.advice}</p>
        </div>
      )}
      {summary.followUpOn && (
        <p className="flex items-center gap-1.5">
          <CalendarClockIcon
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          Follow-up on {formatDateKey(summary.followUpOn)}
        </p>
      )}
    </div>
  );
}
