import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { ChangePasswordCard } from "@/features/auth/components/change-password-card";
import { TelemedicineConsentCard } from "@/features/consent/components/telemedicine-consent-card";
import { hasTelemedicineConsent } from "@/features/consent/data/consents";
import { FamilyMembersCard } from "@/features/family/components/family-members-card";
import { getFamilyMembers } from "@/features/family/data/family-members";
import { MedicineRemindersCard } from "@/features/medicine-reminders/components/medicine-reminders-card";
import { getMedicineReminders } from "@/features/medicine-reminders/data/medicine-reminders";
import { MissingPatientProfileNotice } from "@/features/settings/components/missing-patient-profile-notice";
import { PersonalInfoForm } from "@/features/settings/components/personal-info-form";
import { getPatientProfile } from "@/features/settings/data/patient-profile";
import { TwoFactorCard } from "@/features/two-factor/components/two-factor-card";
import { getVerifiedFactorId } from "@/features/two-factor/data/two-factor";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function PatientSettingsPage() {
  const user = await requireRole("patient");
  const [profile, familyMembers, factorId, consentGiven, medicineReminders] =
    await Promise.all([
      getPatientProfile(user.id, user.email),
      getFamilyMembers(user.id),
      getVerifiedFactorId(),
      hasTelemedicineConsent(),
      getMedicineReminders(user.id),
    ]);

  return (
    <>
      <DashboardPageHeader
        title="Settings"
        description="Manage your profile, family, reminders and how you sign in."
      />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {profile ? (
          <PersonalInfoForm profile={profile} />
        ) : (
          <MissingPatientProfileNotice />
        )}
        <div className="grid h-fit gap-6">
          <FamilyMembersCard members={familyMembers} />
          <MedicineRemindersCard settings={medicineReminders} />
          <TwoFactorCard enabled={Boolean(factorId)} />
          <ChangePasswordCard />
          <TelemedicineConsentCard given={consentGiven} />
        </div>
      </div>
    </>
  );
}
