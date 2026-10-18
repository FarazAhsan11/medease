"use client";

import { Loader2Icon } from "lucide-react";
import type { ComponentProps } from "react";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { PanelCard } from "@/components/shared/panel-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  genders,
  specializations,
} from "@/features/auth/data/registration-options";
import { updateDoctorProfile } from "@/features/doctor-dashboard/actions/update-profile";
import type { DoctorProfile } from "@/features/doctor-dashboard/data/doctor-profile";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type ProfileEditFormProps = {
  profile: DoctorProfile;
  onDone: () => void;
};

export function ProfileEditForm({ profile, onDone }: ProfileEditFormProps) {
  const { pending, onSubmit, fieldError } = useFormAction(
    updateDoctorProfile,
    initialFormState,
    { onSuccess: onDone },
  );

  const field = (
    name: keyof typeof profile & string,
    label: string,
    props: ComponentProps<typeof Input> = {},
  ) => {
    const id = `profile-${name}`;
    return (
      <FormField id={id} label={label} error={fieldError(name)}>
        <Input
          id={id}
          name={name}
          defaultValue={String(profile[name] ?? "")}
          {...fieldErrorProps(id, fieldError(name))}
          {...props}
        />
      </FormField>
    );
  };

  return (
    <PanelCard
      title="Edit profile"
      description="Patients see your name, specialty, city, experience, clinic and bio."
    >
      <form
        onSubmit={onSubmit}
        className="grid gap-4 p-5 sm:grid-cols-2"
        noValidate
      >
        {field("firstName", "First name", { autoComplete: "given-name" })}
        {field("lastName", "Last name", { autoComplete: "family-name" })}
        {field("phone", "Phone", { type: "tel", autoComplete: "tel" })}
        {field("age", "Age", { type: "number", min: 21, max: 100 })}
        <FormField
          id="profile-gender"
          label="Gender"
          error={fieldError("gender")}
        >
          <NativeSelect
            id="profile-gender"
            name="gender"
            defaultValue={profile.gender}
            className="w-full"
          >
            {genders.map((gender) => (
              <NativeSelectOption key={gender} value={gender}>
                {gender}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>
        <FormField
          id="profile-specialization"
          label="Specialization"
          error={fieldError("specialization")}
        >
          <NativeSelect
            id="profile-specialization"
            name="specialization"
            defaultValue={profile.specialization}
            className="w-full"
          >
            {specializations.map((specialization) => (
              <NativeSelectOption key={specialization} value={specialization}>
                {specialization}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>
        {field("experienceYears", "Years of experience", {
          type: "number",
          min: 0,
          max: 70,
        })}
        {field("city", "City", { autoComplete: "address-level2" })}
        <FormField
          id="profile-clinicAddress"
          label="Clinic address"
          error={fieldError("clinicAddress")}
          className="sm:col-span-2"
        >
          <Textarea
            id="profile-clinicAddress"
            name="clinicAddress"
            rows={2}
            defaultValue={profile.clinicAddress}
            {...fieldErrorProps(
              "profile-clinicAddress",
              fieldError("clinicAddress"),
            )}
          />
        </FormField>
        <FormField
          id="profile-bio"
          label="Bio"
          hint="A few lines about your experience and approach."
          error={fieldError("bio")}
          className="sm:col-span-2"
        >
          <Textarea
            id="profile-bio"
            name="bio"
            rows={4}
            maxLength={1000}
            defaultValue={profile.bio ?? ""}
            {...fieldErrorProps("profile-bio", fieldError("bio"))}
          />
        </FormField>
        <p className="text-xs text-muted-foreground sm:col-span-2">
          License number and documents are verified by our team. Contact support
          to change them.
        </p>
        <div className="flex gap-2 border-t pt-4 sm:col-span-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onDone}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={pending} className="gap-2">
            {pending && <Loader2Icon className="animate-spin" aria-hidden />}
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </PanelCard>
  );
}
