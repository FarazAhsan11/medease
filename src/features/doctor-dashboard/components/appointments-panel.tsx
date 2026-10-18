"use client";

import { useState } from "react";

import { PanelCard } from "@/components/shared/panel-card";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import type { Appointment } from "@/features/appointments/lib/appointments";
import { AppointmentDetails } from "@/features/doctor-dashboard/components/appointment-details";
import { formatDateTime, formatTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

type AppointmentsPanelProps = {
  appointments: Appointment[];
  notes: Record<string, string>;
  previousVisits: Record<string, number>;
  // Shown when nothing is booked today.
  nextAppointment: Appointment | null;
};

export function AppointmentsPanel({
  appointments,
  notes,
  previousVisits,
  nextAppointment,
}: AppointmentsPanelProps) {
  const [selectedId, setSelectedId] = useState(appointments[0]?.id);
  const selected = appointments.find((item) => item.id === selectedId);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <PanelCard
        title="Today's schedule"
        description={
          appointments.length === 1
            ? "1 appointment"
            : `${appointments.length} appointments`
        }
      >
        {appointments.length > 0 ? (
          <ul className="divide-y">
            {appointments.map((appointment) => {
              const active = appointment.id === selectedId;

              return (
                <li key={appointment.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(appointment.id)}
                    aria-pressed={active}
                    className={cn(
                      "flex w-full items-center gap-3 px-5 py-4 text-left transition-colors",
                      active ? "bg-secondary/60" : "hover:bg-muted/60",
                      appointment.status === "cancelled" && "opacity-60",
                    )}
                  >
                    <UserAvatar name={appointment.patientName} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {appointment.patientName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {appointment.status === "cancelled"
                          ? "Cancelled"
                          : (appointment.reason ?? "No reason given")}
                      </span>
                    </span>
                    <Badge variant={active ? "default" : "secondary"}>
                      {formatTime(appointment.startsAt, appointment.timezone)}
                    </Badge>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No appointments today.
            {nextAppointment &&
              ` Next: ${nextAppointment.patientName}, ${formatDateTime(nextAppointment.startsAt, nextAppointment.timezone)}.`}
          </p>
        )}
      </PanelCard>
      {selected && (
        <PanelCard title="Patient details" className="h-fit">
          <div className="p-5">
            <AppointmentDetails
              appointment={selected}
              notes={notes[selected.id] ?? ""}
              previousVisits={previousVisits[selected.id] ?? 0}
            />
          </div>
        </PanelCard>
      )}
    </div>
  );
}
