import { PanelCard } from "@/components/shared/panel-card";
import { FamilyMemberSheet } from "@/features/family/components/family-member-sheet";
import { RemoveFamilyMemberDialog } from "@/features/family/components/remove-family-member-dialog";
import {
  familyMemberName,
  MAX_FAMILY_MEMBERS,
  type FamilyMember,
} from "@/features/family/lib/family-members";
import { relationLabels } from "@/features/family/lib/relations";
import { describeAge } from "@/features/medical-profile/lib/medical-profile";
import { CLINIC_TIMEZONE, toDateKey } from "@/lib/datetime";

// The people a patient books visits for (PRO-03).
export function FamilyMembersCard({ members }: { members: FamilyMember[] }) {
  const today = toDateKey(new Date(), CLINIC_TIMEZONE);
  const full = members.length >= MAX_FAMILY_MEMBERS;

  return (
    <PanelCard
      title="Family members"
      description={
        full
          ? `You've added the most allowed (${MAX_FAMILY_MEMBERS}).`
          : "Book visits for people you care for."
      }
      action={<FamilyMemberSheet disabled={full} />}
    >
      {members.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">
          Add a child, parent or anyone else you look after to book their visits
          from your account.
        </p>
      ) : (
        <ul className="divide-y">
          {members.map((member) => {
            const name = familyMemberName(member);
            const age = describeAge(member.dateOfBirth, today);
            return (
              <li
                key={member.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">
                    {relationLabels[member.relation]}
                    {age && ` · ${age}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <FamilyMemberSheet member={member} />
                  <RemoveFamilyMemberDialog memberId={member.id} name={name} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PanelCard>
  );
}
