import { AddToCalendarButton } from "@/features/appointments/components/add-to-calendar-button";
import { AppointmentCard } from "@/features/appointments/components/appointment-card";
import { AppointmentStatusBadge } from "@/features/appointments/components/appointment-status-badge";
import { CancelAppointmentDialog } from "@/features/appointments/components/cancel-appointment-dialog";
import {
  isUpcoming,
  type Appointment,
} from "@/features/appointments/lib/appointments";
import { patientRoutes } from "@/config/routes";
import { JoinCallButton } from "@/features/video-call/components/join-call-button";
import { formatDateTime } from "@/lib/datetime";

type UpcomingAppointmentCardProps = {
  appointment: Appointment;
};

export function UpcomingAppointmentCard({
  appointment,
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
            href={patientRoutes.consultation(appointment.id)}
          />
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
