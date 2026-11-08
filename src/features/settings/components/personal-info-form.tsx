"use client";

import { Loader2Icon } from "lucide-react";
import type { ComponentProps } from "react";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { FormSection } from "@/components/shared/form-section";
import { PanelCard } from "@/components/shared/panel-card";
import { SelectField } from "@/components/shared/select-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { genders } from "@/features/auth/data/registration-options";
import { MedicalProfileFields } from "@/features/medical-profile/components/medical-profile-fields";
import { savePatientProfile } from "@/features/settings/actions/save-patient-profile";
import type { PatientProfile } from "@/features/settings/data/patient-profile";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type PersonalInfoFormProps = {
  profile: PatientProfile;
};

export function PersonalInfoForm({ profile }: PersonalInfoFormProps) {
  const { pending, onSubmit, fieldError } = useFormAction(
    savePatientProfile,
    initialFormState,
  );

  const input = (
    name: keyof PatientProfile & string,
    label: string,
    props: ComponentProps<typeof Input> = {},
  ) => {
    const id = `patient-${name}`;
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
      title="Personal information"
      description="Your name, phone number and medical profile are shared with doctors you book."
    >
      <form
        method="post"
        onSubmit={onSubmit}
        className="grid gap-6 p-5"
        noValidate
      >
        <FormSection title="About you">
          {input("firstName", "First name", { autoComplete: "given-name" })}
          {input("lastName", "Last name", { autoComplete: "family-name" })}
          <FormField
            id="patient-email"
            label="Email"
            hint="Contact support to change your email."
          >
            <Input
              id="patient-email"
              type="email"
              value={profile.email}
              readOnly
              aria-readonly
              className="bg-muted"
            />
          </FormField>
          {input("phone", "Phone", { type: "tel", autoComplete: "tel" })}
          {input("dateOfBirth", "Date of birth", {
            type: "date",
            autoComplete: "bday",
          })}
          <SelectField
            id="patient-gender"
            name="gender"
            label="Gender"
            options={genders}
            defaultValue={profile.gender}
            error={fieldError("gender")}
          />
          <FormField
            id="patient-homeAddress"
            label="Home address"
            hint="For home sample collection, save it under Addresses."
            error={fieldError("homeAddress")}
            className="sm:col-span-2"
          >
            <Textarea
              id="patient-homeAddress"
              name="homeAddress"
              rows={2}
              autoComplete="street-address"
              defaultValue={profile.homeAddress ?? ""}
              {...fieldErrorProps(
                "patient-homeAddress",
                fieldError("homeAddress"),
              )}
            />
          </FormField>
        </FormSection>

        <div className="border-t pt-5">
          <MedicalProfileFields
            idPrefix="patient"
            values={profile}
            fieldError={fieldError}
            medicinesLabel="Medicines you take now"
          />
        </div>

        <div className="border-t pt-5">
          <FormSection title="Emergency contact">
            {input("emergencyContactName", "Name", { autoComplete: "off" })}
            {input("emergencyContactPhone", "Phone", {
              type: "tel",
              autoComplete: "off",
            })}
          </FormSection>
        </div>

        <div className="flex justify-end border-t pt-4">
          <Button type="submit" disabled={pending} className="gap-2">
            {pending && <Loader2Icon className="animate-spin" aria-hidden />}
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </PanelCard>
  );
}
