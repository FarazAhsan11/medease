import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { ConsultationSettingsCard } from "@/features/doctor-dashboard/components/consultation-settings-card";
import { WeeklyAvailabilityCard } from "@/features/doctor-dashboard/components/weekly-availability-card";
import { weeklyAvailability } from "@/features/doctor-dashboard/data/availability";

export const metadata: Metadata = {
  title: "Availability",
};

export default function DoctorAvailabilityPage() {
  return (
    <>
      <DashboardPageHeader
        title="Availability"
        description="Set the hours and consultation types patients can book."
      />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <WeeklyAvailabilityCard days={weeklyAvailability} />
        <ConsultationSettingsCard />
      </div>
    </>
  );
}
