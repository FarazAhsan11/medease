import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { PanelCard } from "@/components/shared/panel-card";
import type { DoctorProfile } from "@/features/doctor-dashboard/data/dashboard";

type ProfileEditFormProps = {
  profile: DoctorProfile;
  onCancel: () => void;
};

const textFields = [
  { id: "firstName", label: "First name", type: "text" },
  { id: "lastName", label: "Last name", type: "text" },
  { id: "email", label: "Email", type: "email" },
  { id: "phone", label: "Phone", type: "tel" },
  { id: "specialization", label: "Specialization", type: "text" },
  { id: "licenseNumber", label: "License number", type: "text" },
] as const;

export function ProfileEditForm({ profile, onCancel }: ProfileEditFormProps) {
  return (
    <PanelCard
      title="Edit profile"
      description="Keep your details up to date for patients."
    >
      <form className="grid gap-4 p-5 sm:grid-cols-2">
        {textFields.map((field) => (
          <FormField
            key={field.id}
            id={`profile-${field.id}`}
            label={field.label}
          >
            <Input
              id={`profile-${field.id}`}
              type={field.type}
              defaultValue={profile[field.id]}
            />
          </FormField>
        ))}
        <FormField id="profile-age" label="Age">
          <Input id="profile-age" type="number" defaultValue={profile.age} />
        </FormField>
        <FormField id="profile-gender" label="Gender">
          <NativeSelect
            id="profile-gender"
            defaultValue={profile.gender}
            className="w-full"
          >
            {["Male", "Female", "Other"].map((gender) => (
              <NativeSelectOption key={gender} value={gender}>
                {gender}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>
        <FormField
          id="profile-address"
          label="Address"
          className="sm:col-span-2"
        >
          <Textarea
            id="profile-address"
            rows={2}
            defaultValue={profile.address}
          />
        </FormField>
        <FormField id="profile-photo" label="Profile photo">
          <Input id="profile-photo" type="file" accept="image/*" />
        </FormField>
        <FormField id="profile-degree" label="Degree document">
          <Input id="profile-degree" type="file" accept=".pdf,.doc,.docx" />
        </FormField>
        <div className="flex gap-2 border-t pt-4 sm:col-span-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button">Save changes</Button>
        </div>
      </form>
    </PanelCard>
  );
}
