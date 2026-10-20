import { UserAvatar } from "@/components/shared/user-avatar";
import { AppointmentStatusBadge } from "@/features/appointments/components/appointment-status-badge";
import type { Appointment } from "@/features/appointments/lib/appointments";
import { formatDateTime } from "@/lib/datetime";

type PrescriptionAppointmentCardProps = {
  appointment: Appointment;
};

// Which visit the doctor is prescribing for.
export function PrescriptionAppointmentCard({
  appointment,
}: PrescriptionAppointmentCardProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-start print:hidden">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <UserAvatar name={appointment.patientName} className="size-11" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold">{appointment.patientName}</h2>
            <AppointmentStatusBadge appointment={appointment} viewer="doctor" />
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(appointment.startsAt, appointment.timezone)}
          </p>
        </div>
      </div>
      <div className="rounded-xl bg-muted p-3 text-sm sm:max-w-sm sm:flex-1">
        <p className="text-xs font-medium text-muted-foreground">
          Reason for visit
        </p>
        <p className="mt-1">{appointment.reason ?? "Not provided"}</p>
      </div>
    </section>
  );
}
