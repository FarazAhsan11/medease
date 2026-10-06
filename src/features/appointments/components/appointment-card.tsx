import { CalendarIcon, ClockIcon, VideoIcon } from "lucide-react";
import type { ReactNode } from "react";

import { UserAvatar } from "@/components/shared/user-avatar";
import type { Appointment } from "@/features/appointments/data/appointments";
import { formatFee } from "@/lib/format";

type AppointmentCardProps = {
  appointment: Appointment;
  status: ReactNode;
  actions: ReactNode;
};

export function AppointmentCard({
  appointment,
  status,
  actions,
}: AppointmentCardProps) {
  const meta = [
    { icon: CalendarIcon, value: appointment.date },
    { icon: ClockIcon, value: appointment.time },
    { icon: VideoIcon, value: "Video consultation" },
  ];

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
            {appointment.specialty}
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
            {meta.map(({ icon: Icon, value }) => (
              <li key={value} className="flex items-center gap-1.5">
                <Icon className="size-3.5" aria-hidden />
                {value}
              </li>
            ))}
            <li className="font-medium text-foreground">
              {formatFee(appointment.fee)}
            </li>
          </ul>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">{actions}</div>
    </article>
  );
}
