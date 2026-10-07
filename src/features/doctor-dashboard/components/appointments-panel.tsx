"use client";

import { useState } from "react";

import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { PanelCard } from "@/components/shared/panel-card";
import { PatientDetailsCard } from "@/features/doctor-dashboard/components/patient-details-card";
import type { PatientAppointment } from "@/features/doctor-dashboard/data/dashboard";
import { cn } from "@/lib/utils";

type AppointmentsPanelProps = {
  appointments: PatientAppointment[];
};

export function AppointmentsPanel({ appointments }: AppointmentsPanelProps) {
  const [selectedId, setSelectedId] = useState(appointments[0]?.id);
  const selected = appointments.find((item) => item.id === selectedId);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <PanelCard
        title="Today's schedule"
        description={`${appointments.length} appointments`}
      >
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
                  )}
                >
                  <UserAvatar name={appointment.patientName} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {appointment.patientName}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {appointment.reason}
                    </span>
                  </span>
                  <Badge variant={active ? "default" : "secondary"}>
                    {appointment.time}
                  </Badge>
                </button>
              </li>
            );
          })}
        </ul>
      </PanelCard>
      {selected && <PatientDetailsCard appointment={selected} />}
    </div>
  );
}
