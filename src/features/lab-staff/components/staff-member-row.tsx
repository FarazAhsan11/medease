import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { RemoveStaffDialog } from "@/features/lab-staff/components/remove-staff-dialog";
import { ResendInviteButton } from "@/features/lab-staff/components/resend-invite-button";
import { StaffRoleSelect } from "@/features/lab-staff/components/staff-role-select";
import {
  labRoleLabels,
  type LabStaffRole,
} from "@/features/lab-staff/lib/lab-permissions";
import {
  isInviteLive,
  type LabStaffMember,
} from "@/features/lab-staff/lib/lab-staff";
import { CLINIC_TIMEZONE, formatDate } from "@/lib/datetime";

type StaffMemberRowProps = {
  member: LabStaffMember;
  now: Date;
};

function StaffStatus({ member, now }: StaffMemberRowProps) {
  if (member.status === "active") {
    return member.activatedAt ? (
      <span>Joined {formatDate(member.activatedAt, CLINIC_TIMEZONE)}</span>
    ) : null;
  }
  return isInviteLive(member, now) ? (
    <StatusBadge tone="info">Invited</StatusBadge>
  ) : (
    <StatusBadge tone="warning">Invitation expired</StatusBadge>
  );
}

export function StaffMemberRow({ member, now }: StaffMemberRowProps) {
  const isAdmin = member.role === "admin";
  const invited = member.status === "invited";

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-4">
      <UserAvatar name={member.name} className="size-9" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{member.name}</p>
        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <StaffStatus member={member} now={now} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {invited && (
          <ResendInviteButton userId={member.userId} />
        )}
        {isAdmin ? (
          <StatusBadge tone="muted">{labRoleLabels.admin}</StatusBadge>
        ) : (
          <>
            <StaffRoleSelect
              userId={member.userId}
              name={member.name}
              role={member.role as LabStaffRole}
            />
            <RemoveStaffDialog
              userId={member.userId}
              name={member.name}
              invited={invited}
            />
          </>
        )}
      </div>
    </li>
  );
}
