import { StatGrid } from "@/components/shared/stat-grid";
import { listPatientAppointments } from "@/features/appointments/data/appointments";
import { groupAppointments } from "@/features/appointments/lib/appointments";
import { labOrders } from "@/features/lab-tests/data/lab-orders";
import { LabResultsCard } from "@/features/patient-dashboard/components/lab-results-card";
import { MedicationRemindersCard } from "@/features/patient-dashboard/components/medication-reminders-card";
import { NextAppointmentBanner } from "@/features/patient-dashboard/components/next-appointment-banner";
import { QuickActions } from "@/features/patient-dashboard/components/quick-actions";
import { UpcomingVisitsCard } from "@/features/patient-dashboard/components/upcoming-visits-card";
import { patientStats } from "@/features/patient-dashboard/data/overview";
import { listPatientPrescriptions } from "@/features/prescriptions/data/prescriptions";
import {
  ENDING_SOON_DAYS,
  getCurrentMedicines,
} from "@/features/prescriptions/lib/prescriptions";
import { requireRole } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/datetime";

function describeMedicines(medicines: ReturnType<typeof getCurrentMedicines>) {
  if (medicines.length === 0) return "None right now";
  const endingSoon = medicines.filter(
    ({ course }) =>
      course.daysLeft !== null && course.daysLeft <= ENDING_SOON_DAYS,
  ).length;
  if (endingSoon > 0) {
    return `${endingSoon} ending in ${ENDING_SOON_DAYS} days or less`;
  }
  const dueToday = medicines.filter(({ course }) => course.dueToday).length;
  return `${dueToday} to take today`;
}

export default async function PatientOverviewPage() {
  const user = await requireRole("patient");
  const [appointments, prescriptions] = await Promise.all([
    listPatientAppointments(user.id),
    listPatientPrescriptions(user.id),
  ]);
  const { upcoming } = groupAppointments(appointments);
  const [next] = upcoming;
  const medicines = getCurrentMedicines(prescriptions);

  // Appointments and medicines are live; the other stats are still sample data.
  const stats = patientStats.map((stat) => {
    if (stat.label === "Upcoming visits") {
      return {
        ...stat,
        value: String(upcoming.length),
        hint: next
          ? `Next: ${formatDateTime(next.startsAt, next.timezone)}`
          : "Nothing booked",
      };
    }
    if (stat.label === "Active medicines") {
      return {
        ...stat,
        value: String(medicines.length),
        hint: describeMedicines(medicines),
      };
    }
    return stat;
  });

  return (
    <>
      <NextAppointmentBanner
        patientName={user.name}
        appointment={next ?? null}
      />
      <QuickActions />
      <StatGrid stats={stats} />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-6">
          <UpcomingVisitsCard appointments={upcoming.slice(0, 3)} />
          <LabResultsCard orders={labOrders} />
        </div>
        <MedicationRemindersCard medicines={medicines} />
      </div>
    </>
  );
}
