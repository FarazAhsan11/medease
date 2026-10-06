import { ProfileField } from "@/features/doctor-dashboard/components/profile-field";
import type { DoctorProfile } from "@/features/doctor-dashboard/data/dashboard";
import {
  profileButtonClass,
  profileFieldClass,
} from "@/features/doctor-dashboard/lib/profile-styles";
import { fileInputClass } from "@/lib/form-styles";
import { cn } from "@/lib/utils";

type ProfileEditFormProps = {
  profile: DoctorProfile;
  onCancel: () => void;
};

const textFields = [
  { label: "Email", key: "email", type: "email" },
  { label: "Phone", key: "phone", type: "tel" },
  { label: "Specialization", key: "specialization", type: "text" },
  { label: "License Number", key: "licenseNumber", type: "text" },
] as const;

export function ProfileEditForm({ profile, onCancel }: ProfileEditFormProps) {
  return (
    <form className="w-[60%] rounded-xl bg-white p-8 shadow-soft max-md:w-full">
      <div className="mb-4 grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <ProfileField label="First Name">
          <input
            defaultValue={profile.firstName}
            className={profileFieldClass}
          />
        </ProfileField>
        <ProfileField label="Last Name">
          <input
            defaultValue={profile.lastName}
            className={profileFieldClass}
          />
        </ProfileField>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <ProfileField label="Age">
          <input
            type="number"
            defaultValue={profile.age}
            className={profileFieldClass}
          />
        </ProfileField>
        <ProfileField label="Gender">
          <select
            defaultValue={profile.gender}
            className="w-full border border-ink-muted text-[13.33px]"
          >
            <option value="">Select Gender</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </ProfileField>
      </div>

      {textFields.map((field) => (
        <ProfileField key={field.key} label={field.label}>
          <input
            type={field.type}
            defaultValue={profile[field.key]}
            className={profileFieldClass}
          />
        </ProfileField>
      ))}

      <ProfileField label="Address">
        <textarea
          rows={3}
          defaultValue={profile.address}
          className={cn(
            profileFieldClass,
            "min-h-20 max-w-[300px] resize-y font-mono text-[13px]",
          )}
        />
      </ProfileField>

      <h4 className="my-[21px] font-bold text-ink-muted">Update Documents</h4>
      <ProfileField label="Profile Photo">
        <input
          type="file"
          accept="image/*"
          className={cn(profileFieldClass, fileInputClass)}
        />
      </ProfileField>
      <ProfileField label="Degree Document">
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          className={cn(profileFieldClass, fileInputClass)}
        />
      </ProfileField>

      <div className="mt-5 flex flex-col gap-2.5">
        <button type="button" className={profileButtonClass}>
          Save Changes
        </button>
        <button type="button" onClick={onCancel} className={profileButtonClass}>
          Cancel
        </button>
      </div>
    </form>
  );
}
