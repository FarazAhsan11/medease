import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { ToggleListCard } from "@/components/shared/toggle-list-card";
import { ChangePasswordCard } from "@/features/auth/components/change-password-card";
import { LabProfileForm } from "@/features/lab-dashboard/components/lab-profile-form";
import {
  labProfile,
  labServices,
} from "@/features/lab-dashboard/data/lab-dashboard";

export const metadata: Metadata = {
  title: "Lab profile",
};

export default function LabProfilePage() {
  return (
    <>
      <DashboardPageHeader
        title="Lab profile"
        description="Your laboratory details, services, and account security."
      />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <LabProfileForm profile={labProfile} />
        <div className="grid h-fit gap-6">
          <ToggleListCard
            title="Services"
            description="Control what patients can book."
            options={labServices}
          />
          <ChangePasswordCard />
        </div>
      </div>
    </>
  );
}
