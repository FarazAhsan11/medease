import type { Appointment } from "@/features/appointments/lib/appointments";
import { VisitSummaryForm } from "@/features/visit-summaries/components/visit-summary-form";
import { VisitSummaryView } from "@/features/visit-summaries/components/visit-summary-view";
import {
  followUpRange,
  getSummaryBlock,
  summaryBlockMessages,
  type VisitSummary,
} from "@/features/visit-summaries/lib/visit-summaries";

type DoctorVisitSummaryProps = {
  appointment: Appointment;
  summary: VisitSummary | null;
};

// The summary part of the appointment details: a form while the visit can
// still be summarised, otherwise what was written or why there's none.
export function DoctorVisitSummary({
  appointment,
  summary,
}: DoctorVisitSummaryProps) {
  const block = getSummaryBlock(appointment);
  if (!summary && (block === "cancelled" || block === "no_show")) return null;

  const { min, max } = followUpRange(appointment);

  return (
    <div className="grid gap-2 border-t pt-5">
      <p className="text-sm font-medium">Visit summary</p>
      {block === null ? (
        <VisitSummaryForm
          appointmentId={appointment.id}
          summary={summary}
          followUpMin={min}
          followUpMax={max}
        />
      ) : (
        <>
          {summary && <VisitSummaryView summary={summary} />}
          <p className="text-xs text-muted-foreground">
            {summaryBlockMessages[block]}
          </p>
        </>
      )}
    </div>
  );
}
