import { PanelCard } from "@/components/shared/panel-card";
import { PanelLink } from "@/components/shared/panel-link";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { patientRoutes } from "@/config/routes";
import type { Appointment } from "@/features/appointments/lib/appointments";
import { formatDate, formatTime } from "@/lib/datetime";

type UpcomingVisitsCardProps = {
  appointments: Appointment[];
};

export function UpcomingVisitsCard({ appointments }: UpcomingVisitsCardProps) {
  return (
    <PanelCard
      title="Upcoming visits"
      action={<PanelLink href={patientRoutes.appointments}>View all</PanelLink>}
    >
      {appointments.length > 0 ? (
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
                  {appointment.doctorSpecialization}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {formatTime(appointment.startsAt, appointment.timezone)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(appointment.startsAt, appointment.timezone)}
                </p>
              </div>
              <StatusBadge tone="success" className="hidden sm:inline-flex">
                Confirmed
              </StatusBadge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          No upcoming visits. Book a doctor to see it here.
        </p>
      )}
    </PanelCard>
  );
}
