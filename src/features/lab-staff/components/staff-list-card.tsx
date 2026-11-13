import { PanelCard } from "@/components/shared/panel-card";
import { InviteStaffSheet } from "@/features/lab-staff/components/invite-staff-sheet";
import { StaffMemberRow } from "@/features/lab-staff/components/staff-member-row";
import {
  MAX_LAB_STAFF,
  type LabStaffMember,
} from "@/features/lab-staff/lib/lab-staff";

type StaffListCardProps = {
  members: LabStaffMember[];
};

export function StaffListCard({ members }: StaffListCardProps) {
  const staffCount = members.filter((member) => member.role !== "admin").length;
  const atLimit = staffCount >= MAX_LAB_STAFF;
  const now = new Date();

  return (
    <PanelCard
      title="People"
      description={
        atLimit
          ? `You've reached the limit of ${MAX_LAB_STAFF} staff.`
          : `${staffCount} of ${MAX_LAB_STAFF} staff`
      }
      action={<InviteStaffSheet disabled={atLimit} />}
    >
      <ul className="divide-y">
        {members.map((member) => (
          <StaffMemberRow key={member.userId} member={member} now={now} />
        ))}
      </ul>
      {staffCount === 0 && (
        <p className="border-t px-5 py-4 text-sm text-muted-foreground">
          Invite your front desk, collectors and pathologists so each person
          signs in with their own account.
        </p>
      )}
    </PanelCard>
  );
}
