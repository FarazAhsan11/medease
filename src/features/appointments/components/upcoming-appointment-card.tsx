import { AddToCalendarButton } from "@/features/appointments/components/add-to-calendar-button";
import { AppointmentCard } from "@/features/appointments/components/appointment-card";
import { AppointmentStatusBadge } from "@/features/appointments/components/appointment-status-badge";
import { CancelAppointmentDialog } from "@/features/appointments/components/cancel-appointment-dialog";
import {
  isUpcoming,
  type Appointment,
} from "@/features/appointments/lib/appointments";
import { patientRoutes } from "@/config/routes";
import { ViewPrescriptionLink } from "@/features/prescriptions/components/view-prescription-link";
import { JoinCallButton } from "@/features/video-call/components/join-call-button";
import { formatDateTime } from "@/lib/datetime";

type UpcomingAppointmentCardProps = {
  appointment: Appointment;
  // Set once the doctor prescribes, which can happen during the call.
  prescriptionId?: string;
};

export function UpcomingAppointmentCard({
  appointment,
  prescriptionId,
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
          <AddToCalendarButton appointment={appointment} />
          {isUpcoming(appointment) && (
            <CancelAppointmentDialog
              appointmentId={appointment.id}
              summary={`${appointment.doctorName} on ${formatDateTime(appointment.startsAt, appointment.timezone)}`}
              notify="doctor"
            />
          )}
        </>
      }
    />
  );
}
