import { AddToCalendarButton } from "@/features/appointments/components/add-to-calendar-button";
import { AppointmentCard } from "@/features/appointments/components/appointment-card";
import { AppointmentStatusBadge } from "@/features/appointments/components/appointment-status-badge";
import { CancelAppointmentDialog } from "@/features/appointments/components/cancel-appointment-dialog";
import {
  isUpcoming,
  type Appointment,
} from "@/features/appointments/lib/appointments";
import { patientRoutes } from "@/config/routes";
import { MessageButton } from "@/features/messaging/components/message-button";
import { ViewPrescriptionLink } from "@/features/prescriptions/components/view-prescription-link";
import { JoinCallButton } from "@/features/video-call/components/join-call-button";
import { PatientVisitSummary } from "@/features/visit-summaries/components/patient-visit-summary";
import type { VisitSummary } from "@/features/visit-summaries/lib/visit-summaries";
import { formatDateTime } from "@/lib/datetime";

type UpcomingAppointmentCardProps = {
  appointment: Appointment;
  // Set once the doctor prescribes, which can happen during the call.
  prescriptionId?: string;
  // Also possible during the call.
  summary?: VisitSummary;
};

export function UpcomingAppointmentCard({
  appointment,
  prescriptionId,
  summary,
}: UpcomingAppointmentCardProps) {
  return (
    <AppointmentCard
      appointment={appointment}
      status={
        <AppointmentStatusBadge appointment={appointment} viewer="patient" />
      }
      actions={
        <>
          <JoinCallButton
            startsAt={appointment.startsAt}
            endsAt={appointment.endsAt}
            href={patientRoutes.consultation(appointment.id)}
          />
          {prescriptionId && (
            <ViewPrescriptionLink
              href={patientRoutes.prescription(prescriptionId)}
            />
          )}
          <MessageButton otherId={appointment.doctorId} />
          <AddToCalendarButton
            // Only what the file needs reaches the browser.
            appointment={{
              id: appointment.id,
              startsAt: appointment.startsAt,
              endsAt: appointment.endsAt,
            }}
            href={patientRoutes.appointments}
          />
          {isUpcoming(appointment) && (
            <CancelAppointmentDialog
              appointmentId={appointment.id}
              summary={`${appointment.doctorName} on ${formatDateTime(appointment.startsAt, appointment.timezone)}`}
              notify="doctor"
            />
          )}
        </>
      }
      footer={summary && <PatientVisitSummary summary={summary} />}
    />
  );
}
