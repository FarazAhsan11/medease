import { LabeledText } from "@/features/doctor-dashboard/components/labeled-text";
import type { PatientAppointment } from "@/features/doctor-dashboard/data/dashboard";

type PatientDetailsProps = {
  appointment: PatientAppointment;
};

export function PatientDetails({ appointment }: PatientDetailsProps) {
  return (
    <div className="mt-5 rounded-lg bg-white p-[15px] shadow-card">
      <h3 className="text-[18.72px] font-bold text-link">Patient Details</h3>
      <LabeledText label="Name" value={appointment.patientName} />
      <LabeledText label="Age" value={appointment.age} />
      <LabeledText label="Gender" value={appointment.gender} />
      <LabeledText label="Medical History" value={appointment.history} />
      <div className="mt-[15px]">
        <h4 className="my-[21px] font-bold text-ink-muted">
          Consultation Notes
        </h4>
        <textarea
          aria-label="Consultation notes"
          placeholder="Enter consultation notes here..."
          className="h-20 w-full max-w-[300px] rounded-[5px] border border-line p-2.5 align-bottom font-mono text-[13px]"
        />
        <button
          type="button"
          className="mt-2.5 rounded-[5px] bg-link px-[15px] py-2 align-bottom text-base text-white hover:bg-link-hover"
        >
          Save Notes
        </button>
      </div>
    </div>
  );
}
