import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { PreviewNotice } from "@/components/shared/preview-notice";
import { ToggleListCard } from "@/components/shared/toggle-list-card";
import { ChangePasswordCard } from "@/features/auth/components/change-password-card";
import { LabProfileForm } from "@/features/lab-dashboard/components/lab-profile-form";
import {
  labProfile,
  labServices,
} from "@/features/lab-dashboard/data/lab-dashboard";
import {
  memberCan,
  requireLabMember,
} from "@/features/lab-staff/lib/lab-member.server";

export const metadata: Metadata = {
  title: "Lab profile",
};

// Staff see only their own account here; the lab's details are the admin's.
export default async function LabProfilePage() {
  const member = await requireLabMember();
  if (!memberCan(member, "profile")) {
    return (
      <>
        <DashboardPageHeader
          title="Your account"
          description={`You sign in to ${member.labName} with this account.`}
        />
        <div className="max-w-xl">
          <ChangePasswordCard />
        </div>
      </>
    );
  }

  return (
    <>
      <PreviewNotice feature="The lab profile" />
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
