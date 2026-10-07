import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { ProfilePanel } from "@/features/doctor-dashboard/components/profile-panel";
import { doctorProfile } from "@/features/doctor-dashboard/data/dashboard";

export const metadata: Metadata = {
  title: "Profile",
};

export default function DoctorProfilePage() {
  return (
    <>
      <DashboardPageHeader
        title="Profile"
        description="How patients see you on MedEase."
      />
      <ProfilePanel profile={doctorProfile} />
    </>
  );
}
