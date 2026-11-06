import { AppointmentStatusBadge } from "@/features/appointments/components/appointment-status-badge";
import type { Appointment } from "@/features/appointments/lib/appointments";
import { AppointmentDetailsSheet } from "@/features/doctor-dashboard/components/appointment-details-sheet";
import type { MedicalProfile } from "@/features/medical-profile/lib/medical-profile";
import { ChartSection } from "@/features/patient-chart/components/chart-section";
import { PrescriptionStatusBadge } from "@/features/prescriptions/components/prescription-status-badge";
import type { PrescriptionSummary } from "@/features/prescriptions/lib/prescriptions";
import { VisitSummaryView } from "@/features/visit-summaries/components/visit-summary-view";
import type { VisitSummary } from "@/features/visit-summaries/lib/visit-summaries";
import { formatDate, formatTime } from "@/lib/datetime";

type ChartVisitCardProps = {
  appointment: Appointment;
  notes: string;
  previousVisits: number;
  prescription: PrescriptionSummary | null;
  summary: VisitSummary | null;
  profile: MedicalProfile | null;
};

// One visit in the chart, read at a glance. Details opens the same sheet as
// the appointments page, for notes, the summary, the prescription and actions.
export function ChartVisitCard(props: ChartVisitCardProps) {
  const { appointment, notes, prescription, summary } = props;
  const { timezone } = appointment;
  const cancelled = appointment.status === "cancelled";

  return (
    <article className="grid gap-4 rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h3 className="text-sm font-semibold">
            {formatDate(appointment.startsAt, timezone)}
          </h3>
          <p className="text-xs text-muted-foreground">
            {formatTime(appointment.startsAt, timezone)} –{" "}
            {formatTime(appointment.endsAt, timezone)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AppointmentStatusBadge appointment={appointment} viewer="doctor" />
          <AppointmentDetailsSheet {...props} />
        </div>
      </div>

      <ChartSection
        title={cancelled ? "Cancellation reason" : "Reason for visit"}
      >
        <p className="text-sm break-words">
          {(cancelled ? appointment.cancellationReason : appointment.reason) ??
            "Not provided"}
        </p>
      </ChartSection>

      {summary && (
        <ChartSection title="Visit summary (seen by the patient)">
          <VisitSummaryView summary={summary} />
        </ChartSection>
      )}

      {prescription && (
        <ChartSection title="Prescription">
          <div className="flex flex-wrap items-center gap-2">
            <PrescriptionStatusBadge status={prescription.status} />
            <p className="text-sm break-words text-muted-foreground">
              {prescription.medicines.join(", ")}
            </p>
          </div>
        </ChartSection>
      )}

      {notes && (
        <ChartSection title="Your private notes">
          <p className="rounded-xl bg-muted p-3 text-sm break-words whitespace-pre-line">
            {notes}
          </p>
        </ChartSection>
      )}
    </article>
  );
}
