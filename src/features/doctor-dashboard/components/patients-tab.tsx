import { DashboardSection } from "@/features/doctor-dashboard/components/dashboard-section";
import { LabeledText } from "@/features/doctor-dashboard/components/labeled-text";
import type { PatientAppointment } from "@/features/doctor-dashboard/data/dashboard";

type PatientsTabProps = {
  patients: PatientAppointment[];
};

export function PatientsTab({ patients }: PatientsTabProps) {
  return (
    <DashboardSection title="Patient List">
      <div className="flex flex-wrap gap-5 max-md:flex-col max-md:items-center">
        {patients.map((patient) => (
          <div
            key={patient.id}
            className="w-[250px] rounded-lg bg-white p-[15px] shadow-card"
          >
            <h3 className="text-lg font-bold text-link">
              {patient.patientName}
            </h3>
            <LabeledText label="Age" value={patient.age} />
            <LabeledText label="Gender" value={patient.gender} />
            <LabeledText label="Last Visit" value={patient.time} />
          </div>
        ))}
      </div>
    </DashboardSection>
  );
}
