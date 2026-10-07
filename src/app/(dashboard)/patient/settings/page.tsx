import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { ToggleListCard } from "@/components/shared/toggle-list-card";
import { PersonalInfoForm } from "@/features/settings/components/personal-info-form";
import { ChangePasswordCard } from "@/components/shared/change-password-card";
import {
  patientNotificationPreferences,
  patientProfile,
} from "@/features/settings/data/patient-profile";

export const metadata: Metadata = {
  title: "Settings",
};

export default function PatientSettingsPage() {
  return (
    <>
      <DashboardPageHeader
        title="Settings"
        description="Manage your profile, notifications, and password."
      />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <PersonalInfoForm profile={patientProfile} />
        <div className="grid h-fit gap-6">
          <ToggleListCard
            title="Notifications"
            description="Choose what we send to your email and phone."
            options={patientNotificationPreferences}
          />
          <ChangePasswordCard />
        </div>
      </div>
    </>
  );
}
