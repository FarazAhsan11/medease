"use client";

import { useState } from "react";

import { DashboardSection } from "@/features/doctor-dashboard/components/dashboard-section";
import { LabeledText } from "@/features/doctor-dashboard/components/labeled-text";
import { PatientDetails } from "@/features/doctor-dashboard/components/patient-details";
import type { PatientAppointment } from "@/features/doctor-dashboard/data/dashboard";

type AppointmentsTabProps = {
  appointments: PatientAppointment[];
};

export function AppointmentsTab({ appointments }: AppointmentsTabProps) {
  const [selected, setSelected] = useState<PatientAppointment | null>(null);

  return (
    <DashboardSection title="Upcoming Appointments">
      <div className="flex flex-wrap gap-5 max-md:flex-col max-md:items-center">
        {appointments.map((appointment) => (
          <button
            key={appointment.id}
            type="button"
            onClick={() => setSelected(appointment)}
            className="flex items-center justify-between rounded-[30px] border border-line-soft bg-surface-card p-5 pl-10 text-left shadow-appointment transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-appointment-hover"
          >
            <span className="text-lg font-bold text-link">
              {appointment.patientName}
            </span>
            <LabeledText as="span" label="Reason" value={appointment.reason} />
            <LabeledText as="span" label="Time" value={appointment.time} />
          </button>
        ))}
      </div>
      {selected && <PatientDetails appointment={selected} />}
    </DashboardSection>
  );
}
