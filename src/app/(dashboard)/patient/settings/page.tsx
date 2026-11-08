import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { AddressesCard } from "@/features/addresses/components/addresses-card";
import { getPatientAddresses } from "@/features/addresses/data/addresses";
import { ChangePasswordCard } from "@/features/auth/components/change-password-card";
import { TelemedicineConsentCard } from "@/features/consent/components/telemedicine-consent-card";
import { hasTelemedicineConsent } from "@/features/consent/data/consents";
import { FamilyMembersCard } from "@/features/family/components/family-members-card";
import { getFamilyMembers } from "@/features/family/data/family-members";
import { MedicineRemindersCard } from "@/features/medicine-reminders/components/medicine-reminders-card";
import { getMedicineReminders } from "@/features/medicine-reminders/data/medicine-reminders";
import { EmailPreferencesCard } from "@/features/notifications/components/email-preferences-card";
import { getEmailPreferences } from "@/features/notifications/data/notification-preferences";
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
  const [
    profile,
    addresses,
    familyMembers,
    factorId,
    consentGiven,
    medicineReminders,
    emailPreferences,
  ] = await Promise.all([
    getPatientProfile(user.id, user.email),
    getPatientAddresses(user.id),
    getFamilyMembers(user.id),
    getVerifiedFactorId(),
    hasTelemedicineConsent(),
    getMedicineReminders(user.id),
    getEmailPreferences(user.id),
  ]);

  return (
    <>
      <DashboardPageHeader
        title="Settings"
        description="Manage your profile, family, addresses, reminders, emails and how you sign in."
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {profile ? (
          <PersonalInfoForm profile={profile} />
        ) : (
          <MissingPatientProfileNotice />
        )}
        <div className="grid h-fit grid-cols-[minmax(0,1fr)] gap-6">
          <FamilyMembersCard members={familyMembers} />
          {profile && (
            <AddressesCard
              addresses={addresses}
              accountPhone={profile.phone}
              homeAddress={profile.homeAddress}
            />
          )}
          <MedicineRemindersCard settings={medicineReminders} />
          <EmailPreferencesCard role="patient" preferences={emailPreferences} />
          <TwoFactorCard enabled={Boolean(factorId)} />
          <ChangePasswordCard />
          <TelemedicineConsentCard given={consentGiven} />
        </div>
      </div>
    </>
  );
}
