import { listPatientAppointments } from "@/features/appointments/data/appointments";
import { groupAppointments } from "@/features/appointments/lib/appointments";
import { getPatientLabBookings } from "@/features/lab-booking/data/lab-bookings";
import { LabResultsCard } from "@/features/patient-dashboard/components/lab-results-card";
import { MedicationRemindersCard } from "@/features/patient-dashboard/components/medication-reminders-card";
import { NextAppointmentBanner } from "@/features/patient-dashboard/components/next-appointment-banner";
import { QuickActions } from "@/features/patient-dashboard/components/quick-actions";
import { UpcomingVisitsCard } from "@/features/patient-dashboard/components/upcoming-visits-card";
import { listPatientPrescriptions } from "@/features/prescriptions/data/prescriptions";
import { getCurrentMedicines } from "@/features/prescriptions/lib/prescriptions";
import { requireRole } from "@/lib/auth/session";

export default async function PatientOverviewPage() {
  const user = await requireRole("patient");
  const [appointments, prescriptions, labBookings] = await Promise.all([
    listPatientAppointments(user.id),
    listPatientPrescriptions(user.id),
    getPatientLabBookings(user.id, 3),
  ]);
  const { upcoming } = groupAppointments(appointments);
  const [next] = upcoming;
  const medicines = getCurrentMedicines(prescriptions);

  return (
    <>
      <NextAppointmentBanner
        patientName={user.name}
        appointment={next ?? null}
      />
      <QuickActions />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
          <UpcomingVisitsCard appointments={upcoming.slice(0, 3)} />
          <LabResultsCard bookings={labBookings} />
        </div>
        <MedicationRemindersCard medicines={medicines} />
      </div>
    </>
  );
}
