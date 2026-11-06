"use client";

import { useState } from "react";

import { PanelCard } from "@/components/shared/panel-card";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import type { Appointment } from "@/features/appointments/lib/appointments";
import { AppointmentDetails } from "@/features/doctor-dashboard/components/appointment-details";
import type { MedicalProfile } from "@/features/medical-profile/lib/medical-profile";
import type { PrescriptionSummary } from "@/features/prescriptions/lib/prescriptions";
import type { VisitSummary } from "@/features/visit-summaries/lib/visit-summaries";
import { formatDateTime, formatTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

type AppointmentsPanelProps = {
  appointments: Appointment[];
  notes: Record<string, string>;
  previousVisits: Record<string, number>;
  prescriptions: Record<string, PrescriptionSummary>;
  summaries: Record<string, VisitSummary>;
  // By care recipient id.
  profiles: Record<string, MedicalProfile>;
  // Shown when nothing is booked today.
  nextAppointment: Appointment | null;
};

export function AppointmentsPanel({
  appointments,
  notes,
  previousVisits,
  prescriptions,
  summaries,
  profiles,
  nextAppointment,
}: AppointmentsPanelProps) {
  const [selectedId, setSelectedId] = useState(appointments[0]?.id);
  const selected = appointments.find((item) => item.id === selectedId);
  // Cancelled visits stay listed but aren't counted, matching the stat above.
  const booked = appointments.filter(
    (item) => item.status !== "cancelled",
  ).length;

  return (
    <div
      className={cn(
        "grid items-start gap-6",
        selected && "lg:grid-cols-[minmax(0,1fr)_360px]",
      )}
    >
      <PanelCard
        title="Today's schedule"
        description={booked === 1 ? "1 appointment" : `${booked} appointments`}
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
                    <UserAvatar name={appointment.careRecipientName} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {appointment.careRecipientName}
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
              ` Next: ${nextAppointment.careRecipientName}, ${formatDateTime(nextAppointment.startsAt, nextAppointment.timezone)}.`}
          </p>
        )}
      </PanelCard>
      {selected && (
        <PanelCard title="Patient details">
          <div className="p-5">
            <AppointmentDetails
              appointment={selected}
              notes={notes[selected.id] ?? ""}
              previousVisits={previousVisits[selected.id] ?? 0}
              prescription={prescriptions[selected.id] ?? null}
              summary={summaries[selected.id] ?? null}
              profile={profiles[selected.careRecipientId] ?? null}
            />
          </div>
        </PanelCard>
      )}
    </div>
  );
}
