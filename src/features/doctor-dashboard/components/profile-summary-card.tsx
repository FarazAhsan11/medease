import { PencilIcon } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DoctorProfile } from "@/features/doctor-dashboard/data/doctor-profile";
import { formatDate } from "@/lib/datetime";

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
  const name = `${profile.firstName} ${profile.lastName}`;

  return (
    <aside className="flex h-fit flex-col items-center rounded-2xl border bg-card p-6 text-center">
      <UserAvatar
        name={name}
        src={profile.photoUrl ?? undefined}
        className="size-24 ring-4 ring-secondary"
      />
      <h2 className="mt-4 text-base font-semibold">Dr. {name}</h2>
      <Badge variant="secondary" className="mt-1.5">
        {profile.specialization}
      </Badge>
      <div className="mt-3">
        {profile.acceptingAppointments ? (
          <StatusBadge tone="success" dot>
            Accepting bookings
          </StatusBadge>
        ) : (
          <StatusBadge tone="muted">Bookings paused</StatusBadge>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Member since {formatDate(profile.createdAt, profile.timezone)}
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
