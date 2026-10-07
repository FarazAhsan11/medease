import { PanelCard } from "@/components/shared/panel-card";
import { PanelLink } from "@/components/shared/panel-link";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { Appointment } from "@/features/appointments/data/appointments";

type UpcomingVisitsCardProps = {
  appointments: Appointment[];
};

export function UpcomingVisitsCard({ appointments }: UpcomingVisitsCardProps) {
  return (
    <PanelCard
      title="Upcoming visits"
      action={<PanelLink href="/patient/appointments">View all</PanelLink>}
    >
      <ul className="divide-y">
        {appointments.map((appointment) => (
          <li
            key={appointment.id}
            className="flex items-center gap-3 px-5 py-4"
          >
            <UserAvatar name={appointment.doctorName} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{appointment.doctorName}</p>
              <p className="text-xs text-muted-foreground">
                {appointment.specialty}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{appointment.time}</p>
              <p className="text-xs text-muted-foreground">
                {appointment.date}
              </p>
            </div>
            <StatusBadge tone="success" className="hidden sm:inline-flex">
              Confirmed
            </StatusBadge>
          </li>
        ))}
      </ul>
    </PanelCard>
  );
}
