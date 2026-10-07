import { StatGrid } from "@/components/shared/stat-grid";
import { upcomingAppointments } from "@/features/appointments/data/appointments";
import { labOrders } from "@/features/lab-tests/data/lab-orders";
import { LabResultsCard } from "@/features/patient-dashboard/components/lab-results-card";
import { MedicationRemindersCard } from "@/features/patient-dashboard/components/medication-reminders-card";
import { NextAppointmentBanner } from "@/features/patient-dashboard/components/next-appointment-banner";
import { QuickActions } from "@/features/patient-dashboard/components/quick-actions";
import { UpcomingVisitsCard } from "@/features/patient-dashboard/components/upcoming-visits-card";
import { patientStats } from "@/features/patient-dashboard/data/overview";
import { prescriptions } from "@/features/prescriptions/data/prescriptions";
import { patientProfile } from "@/features/settings/data/patient-profile";

export default function PatientOverviewPage() {
  const [nextAppointment] = upcomingAppointments;

  return (
    <>
      <NextAppointmentBanner
        patientName={`${patientProfile.firstName} ${patientProfile.lastName}`}
        appointment={nextAppointment}
      />
      <QuickActions />
      <StatGrid stats={patientStats} />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-6">
          <UpcomingVisitsCard appointments={upcomingAppointments} />
          <LabResultsCard orders={labOrders} />
        </div>
        <MedicationRemindersCard prescriptions={prescriptions} />
      </div>
    </>
  );
}
