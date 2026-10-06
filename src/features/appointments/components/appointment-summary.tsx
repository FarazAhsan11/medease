import { AppointmentDetail } from "@/features/appointments/components/appointment-detail";
import type { Appointment } from "@/features/appointments/data/appointments";

type AppointmentSummaryProps = {
  appointment: Appointment;
};

export function AppointmentSummary({ appointment }: AppointmentSummaryProps) {
  return (
    <>
      <AppointmentDetail label="Doctor's Name">
        {appointment.doctorName}
      </AppointmentDetail>
      <AppointmentDetail label="Patient's Name">
        {appointment.patientName}
      </AppointmentDetail>
      <AppointmentDetail label="Date and Time">
        {appointment.dateTime}
      </AppointmentDetail>
      <AppointmentDetail label="Consultation Fee">
        PKR {appointment.consultationFee}
      </AppointmentDetail>
    </>
  );
}
