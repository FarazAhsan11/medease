import { CalendarIcon, ClockIcon, MessageSquareTextIcon } from "lucide-react";
import type { ReactNode } from "react";

import { UserAvatar } from "@/components/shared/user-avatar";
import type { Appointment } from "@/features/appointments/lib/appointments";
import { formatDate, formatTime } from "@/lib/datetime";
import { formatFee } from "@/lib/format";

type AppointmentCardProps = {
  appointment: Appointment;
  status: ReactNode;
  actions?: ReactNode;
};

export function AppointmentCard({
  appointment,
  status,
  actions,
}: AppointmentCardProps) {
  const { timezone } = appointment;

  return (
    <article className="flex flex-col gap-5 rounded-2xl border bg-card p-5 md:flex-row md:items-center">
      <div className="flex flex-1 items-start gap-4">
        <UserAvatar name={appointment.doctorName} className="size-12" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{appointment.doctorName}</h3>
            {status}
          </div>
          <p className="text-sm text-muted-foreground">
            {appointment.doctorSpecialization}
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <CalendarIcon className="size-3.5" aria-hidden />
              {formatDate(appointment.startsAt, timezone)}
            </li>
            <li className="flex items-center gap-1.5">
              <ClockIcon className="size-3.5" aria-hidden />
              {formatTime(appointment.startsAt, timezone)} –{" "}
              {formatTime(appointment.endsAt, timezone)}
            </li>
            <li className="font-medium text-foreground">
              {formatFee(appointment.consultationFee)}
            </li>
          </ul>
          {(appointment.reason || appointment.cancellationReason) && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
              <MessageSquareTextIcon
                className="mt-0.5 size-3.5 shrink-0"
                aria-hidden
              />
              {appointment.status === "cancelled" &&
              appointment.cancellationReason
                ? `Cancellation reason: ${appointment.cancellationReason}`
                : appointment.reason}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap gap-2 md:justify-end">{actions}</div>
      )}
    </article>
  );
}
