import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { MissingProfileNotice } from "@/features/doctor-dashboard/components/missing-profile-notice";
import { ProfilePanel } from "@/features/doctor-dashboard/components/profile-panel";
import { getDoctorProfile } from "@/features/doctor-dashboard/data/doctor-profile";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function DoctorProfilePage() {
  const user = await requireRole("doctor");
  const profile = await getDoctorProfile(user.id);

  return (
    <>
      <DashboardPageHeader
        title="Profile"
        description="How patients see you on MedEase."
      />
      {profile ? (
        <ProfilePanel profile={profile} email={user.email} />
      ) : (
        <MissingProfileNotice />
      )}
    </>
  );
}
