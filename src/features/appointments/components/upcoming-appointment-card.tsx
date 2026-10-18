import { AddToCalendarButton } from "@/features/appointments/components/add-to-calendar-button";
import { AppointmentCard } from "@/features/appointments/components/appointment-card";
import { AppointmentStatusBadge } from "@/features/appointments/components/appointment-status-badge";
import { CancelAppointmentDialog } from "@/features/appointments/components/cancel-appointment-dialog";
import type { Appointment } from "@/features/appointments/lib/appointments";
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
          <AddToCalendarButton appointment={appointment} />
          <CancelAppointmentDialog
            appointmentId={appointment.id}
            summary={`${appointment.doctorName} on ${formatDateTime(appointment.startsAt, appointment.timezone)}`}
            notify="doctor"
          />
        </>
      }
    />
  );
}
