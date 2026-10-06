"use client";

import { useState } from "react";

import { DashboardSection } from "@/features/doctor-dashboard/components/dashboard-section";
import { ProfileEditForm } from "@/features/doctor-dashboard/components/profile-edit-form";
import { ProfileInfo } from "@/features/doctor-dashboard/components/profile-info";
import { ProfilePhotoCard } from "@/features/doctor-dashboard/components/profile-photo-card";
import type { DoctorProfile } from "@/features/doctor-dashboard/data/dashboard";

type ProfileTabProps = {
  profile: DoctorProfile;
};

export function ProfileTab({ profile }: ProfileTabProps) {
  const [editing, setEditing] = useState(false);

  return (
    <DashboardSection title="Doctor Profile">
      <div className="mt-4 flex w-[90%] gap-8 rounded-xl bg-surface-subtle p-4 max-md:flex-col">
        <ProfilePhotoCard
          name={`${profile.firstName} ${profile.lastName}`}
          specialization={profile.specialization}
          editing={editing}
        />
        <div className="flex flex-1 flex-col gap-2.5">
          {editing ? (
            <ProfileEditForm
              profile={profile}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <ProfileInfo profile={profile} onEdit={() => setEditing(true)} />
          )}
        </div>
      </div>
    </DashboardSection>
  );
}
