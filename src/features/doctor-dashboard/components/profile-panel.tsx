"use client";

import { useState } from "react";

import { ProfileDetails } from "@/features/doctor-dashboard/components/profile-details";
import { ProfileEditForm } from "@/features/doctor-dashboard/components/profile-edit-form";
import { ProfileSummaryCard } from "@/features/doctor-dashboard/components/profile-summary-card";
import type { DoctorProfile } from "@/features/doctor-dashboard/data/dashboard";

type ProfilePanelProps = {
  profile: DoctorProfile;
};

export function ProfilePanel({ profile }: ProfilePanelProps) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <ProfileSummaryCard
        profile={profile}
        editing={editing}
        onEdit={() => setEditing(true)}
      />
      {editing ? (
        <ProfileEditForm profile={profile} onCancel={() => setEditing(false)} />
      ) : (
        <ProfileDetails profile={profile} />
      )}
    </div>
  );
}
