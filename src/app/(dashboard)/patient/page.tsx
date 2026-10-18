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
import { prescriptions } from "@/features/prescriptions/data/prescriptions";
import { requireRole } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/datetime";

export default async function PatientOverviewPage() {
  const user = await requireRole("patient");
  const { upcoming } = groupAppointments(
    await listPatientAppointments(user.id),
  );
  const [next] = upcoming;

  // Appointments are live; the other stats are still sample data.
  const stats = patientStats.map((stat) =>
    stat.label === "Upcoming visits"
      ? {
          ...stat,
          value: String(upcoming.length),
          hint: next
            ? `Next: ${formatDateTime(next.startsAt, next.timezone)}`
            : "Nothing booked",
        }
      : stat,
  );

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
        <MedicationRemindersCard prescriptions={prescriptions} />
      </div>
    </>
  );
}
