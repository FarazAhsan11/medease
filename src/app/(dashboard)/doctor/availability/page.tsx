import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { MissingProfileNotice } from "@/features/doctor-dashboard/components/missing-profile-notice";
import { ScheduleForm } from "@/features/doctor-dashboard/components/schedule-form";
import { getDoctorProfile } from "@/features/doctor-dashboard/data/doctor-profile";
import { getWeeklyHours } from "@/features/doctors/data/doctor-directory";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Availability",
};

export default async function DoctorAvailabilityPage() {
  const user = await requireRole("doctor");
  const [profile, hours] = await Promise.all([
    getDoctorProfile(user.id),
    getWeeklyHours(user.id),
  ]);

  return (
    <>
      <DashboardPageHeader
        title="Availability"
        description="Set the hours patients can book and how long each appointment lasts."
      />
      {profile ? (
        <ScheduleForm
          hours={hours}
          slotMinutes={profile.slotMinutes}
          accepting={profile.acceptingAppointments}
          fee={profile.consultationFee}
        />
      ) : (
        <MissingProfileNotice />
      )}
    </>
  );
}
