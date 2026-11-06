import { PanelCard } from "@/components/shared/panel-card";
import { CancelAppointmentDialog } from "@/features/appointments/components/cancel-appointment-dialog";
import type { Appointment } from "@/features/appointments/lib/appointments";
import { TimeOffForm } from "@/features/doctor-dashboard/components/time-off-form";
import { TimeOffRemoveButton } from "@/features/doctor-dashboard/components/time-off-remove-button";
import type { TimeOff } from "@/features/doctor-dashboard/data/time-off";
import { formatDateKey, formatDateTime } from "@/lib/datetime";

type TimeOffPanelProps = {
  today: string;
  entries: TimeOff[];
  // Bookings made before the time off was added, still waiting to be cancelled.
  affected: Appointment[];
};

const describe = ({ startsOn, endsOn }: TimeOff) =>
  startsOn === endsOn
    ? formatDateKey(startsOn)
    : `${formatDateKey(startsOn)} to ${formatDateKey(endsOn)}`;

export function TimeOffPanel({ today, entries, affected }: TimeOffPanelProps) {
  return (
    <PanelCard
      title="Time off"
      description="Patients can't book these days. Existing bookings stay until you cancel them."
    >
      <div className="grid gap-5 p-5">
        <TimeOffForm today={today} />

        {entries.length > 0 && (
          <ul className="divide-y rounded-xl border">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-4 px-4 py-2 text-sm"
              >
                {describe(entry)}
                <TimeOffRemoveButton id={entry.id} label={describe(entry)} />
              </li>
            ))}
          </ul>
        )}

        {affected.length > 0 && (
          <div className="grid gap-2">
            <h3 className="text-sm font-semibold">
              Bookings during your time off
            </h3>
            <p className="text-sm text-muted-foreground">
              Cancel these so each patient is told and can book another time.
            </p>
            <ul className="divide-y rounded-xl border">
              {affected.map((appointment) => {
                const when = formatDateTime(
                  appointment.startsAt,
                  appointment.timezone,
                );

                return (
                  <li
                    key={appointment.id}
                    className="flex items-center justify-between gap-4 px-4 py-2 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {appointment.careRecipientName}
                      </span>
                      <span className="text-muted-foreground">{when}</span>
                    </span>
                    <CancelAppointmentDialog
                      appointmentId={appointment.id}
                      summary={`${appointment.careRecipientName} on ${when}`}
                      notify="patient"
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </PanelCard>
  );
}
