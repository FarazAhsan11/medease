import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { MissingProfileNotice } from "@/features/doctor-dashboard/components/missing-profile-notice";
import { ProfilePanel } from "@/features/doctor-dashboard/components/profile-panel";
import { getDoctorProfile } from "@/features/doctor-dashboard/data/doctor-profile";
import { EmailPreferencesCard } from "@/features/notifications/components/email-preferences-card";
import { getEmailPreferences } from "@/features/notifications/data/notification-preferences";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function DoctorProfilePage() {
  const user = await requireRole("doctor");
  const [profile, emailPreferences] = await Promise.all([
    getDoctorProfile(user.id),
    getEmailPreferences(user.id),
  ]);

  return (
    <>
      <DashboardPageHeader
        title="Profile"
        description="How patients see you on MedEase, and the emails you get."
      />
      <div className="grid gap-6">
        {profile ? (
          <ProfilePanel profile={profile} email={user.email} />
        ) : (
          <MissingProfileNotice />
        )}
        <EmailPreferencesCard
          role="doctor"
          preferences={emailPreferences}
          className="max-w-2xl"
        />
      </div>
    </>
  );
}
