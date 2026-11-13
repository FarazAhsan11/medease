import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { StaffListCard } from "@/features/lab-staff/components/staff-list-card";
import { getLabStaff } from "@/features/lab-staff/data/lab-staff";
import { requireLabMember } from "@/features/lab-staff/lib/lab-member.server";

export const metadata: Metadata = {
  title: "Staff",
};

export default async function LabStaffPage() {
  await requireLabMember("staff");
  const members = await getLabStaff();

  return (
    <>
      <DashboardPageHeader
        title="Staff"
        description="Who can work in your lab's account, and what each person can do."
      />
      <StaffListCard members={members} />
    </>
  );
}
