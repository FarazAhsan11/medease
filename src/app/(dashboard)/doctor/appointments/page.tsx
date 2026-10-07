import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { VisitsTabs } from "@/features/doctor-dashboard/components/visits-tabs";
import { scheduledVisits } from "@/features/doctor-dashboard/data/schedule";

export const metadata: Metadata = {
  title: "Appointments",
};

export default function DoctorAppointmentsPage() {
  return (
    <>
      <DashboardPageHeader
        title="Appointments"
        description="All consultations booked with you this week."
      />
      <VisitsTabs visits={scheduledVisits} />
    </>
  );
}
