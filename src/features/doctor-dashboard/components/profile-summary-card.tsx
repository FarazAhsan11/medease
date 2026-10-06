import { PencilIcon } from "lucide-react";

import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DoctorProfile } from "@/features/doctor-dashboard/data/dashboard";

type ProfileSummaryCardProps = {
  profile: DoctorProfile;
  editing: boolean;
  onEdit: () => void;
};

export function ProfileSummaryCard({
  profile,
  editing,
  onEdit,
}: ProfileSummaryCardProps) {
  return (
    <aside className="flex h-fit flex-col items-center rounded-2xl border bg-card p-6 text-center">
      <UserAvatar
        name={`${profile.firstName} ${profile.lastName}`}
        src={profile.photo}
        className="size-24 ring-4 ring-secondary"
      />
      <h2 className="mt-4 text-base font-semibold">
        Dr. {profile.firstName} {profile.lastName}
      </h2>
      <Badge variant="secondary" className="mt-1.5">
        {profile.specialization}
      </Badge>
      <p className="mt-3 text-xs text-muted-foreground">
        Member since {profile.memberSince}
      </p>
      {!editing && (
        <Button
          type="button"
          variant="outline"
          onClick={onEdit}
          className="mt-5 w-full gap-1.5"
        >
          <PencilIcon aria-hidden />
          Edit profile
        </Button>
      )}
    </aside>
  );
}
