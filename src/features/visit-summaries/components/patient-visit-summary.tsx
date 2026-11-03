import { ClipboardListIcon } from "lucide-react";

import { VisitSummaryView } from "@/features/visit-summaries/components/visit-summary-view";
import type { VisitSummary } from "@/features/visit-summaries/lib/visit-summaries";

// The doctor's summary under a visit on the patient's appointments page.
export function PatientVisitSummary({ summary }: { summary: VisitSummary }) {
  return (
    <section className="grid gap-3 rounded-xl bg-muted p-4">
      <h4 className="flex items-center gap-1.5 text-sm font-semibold">
        <ClipboardListIcon className="size-4 text-primary" aria-hidden />
        Visit summary
      </h4>
      <VisitSummaryView summary={summary} />
    </section>
  );
}
