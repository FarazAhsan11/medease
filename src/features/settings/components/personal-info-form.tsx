import { FormField } from "@/components/shared/form-field";
import { PanelCard } from "@/components/shared/panel-card";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { PatientProfile } from "@/features/settings/data/patient-profile";

type PersonalInfoFormProps = {
  profile: PatientProfile;
};

export function PersonalInfoForm({ profile }: PersonalInfoFormProps) {
  const fullName = `${profile.firstName} ${profile.lastName}`;

  return (
    <PanelCard
      title="Personal information"
      description="This is shared with doctors you book."
    >
      <form className="grid gap-5 p-5">
        <div className="flex items-center gap-4">
          <UserAvatar name={fullName} className="size-14 text-base" />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm">
              Change photo
            </Button>
            <Button type="button" variant="ghost" size="sm">
              Remove
            </Button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="patient-first-name" label="First name">
            <Input id="patient-first-name" defaultValue={profile.firstName} />
          </FormField>
          <FormField id="patient-last-name" label="Last name">
            <Input id="patient-last-name" defaultValue={profile.lastName} />
          </FormField>
          <FormField id="patient-email" label="Email">
            <Input
              id="patient-email"
              type="email"
              defaultValue={profile.email}
            />
          </FormField>
          <FormField id="patient-phone" label="Phone">
            <Input id="patient-phone" type="tel" defaultValue={profile.phone} />
          </FormField>
          <FormField id="patient-dob" label="Date of birth">
            <Input
              id="patient-dob"
              type="date"
              defaultValue={profile.dateOfBirth}
            />
          </FormField>
          <FormField id="patient-gender" label="Gender">
            <NativeSelect
              id="patient-gender"
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
            id="patient-address"
            label="Address"
            className="sm:col-span-2"
          >
            <Textarea
              id="patient-address"
              rows={2}
              defaultValue={profile.address}
            />
          </FormField>
        </div>
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="button">Save changes</Button>
        </div>
      </form>
    </PanelCard>
  );
}
