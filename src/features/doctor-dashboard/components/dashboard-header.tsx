import { LogOutIcon } from "lucide-react";
import Link from "next/link";

import { UserAvatar } from "@/components/shared/user-avatar";
import { buttonVariants } from "@/components/ui/button";
import type { DoctorProfile } from "@/features/doctor-dashboard/data/dashboard";

type DashboardHeaderProps = {
  profile: DoctorProfile;
};

export function DashboardHeader({ profile }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <UserAvatar
          name={`${profile.firstName} ${profile.lastName}`}
          src={profile.photo}
          className="size-12"
        />
        <div>
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="text-xl font-semibold sm:text-2xl">
            Dr. {profile.firstName} {profile.lastName}
          </h1>
        </div>
      </div>
      <Link
        href="/doctor/login"
        className={buttonVariants({
          variant: "outline",
          className: "gap-1.5 self-start sm:self-auto",
        })}
      >
        <LogOutIcon aria-hidden />
        Log out
      </Link>
    </div>
  );
}
