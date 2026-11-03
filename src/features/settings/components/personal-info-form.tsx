"use client";

import { Loader2Icon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { PanelCard } from "@/components/shared/panel-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { genders } from "@/features/auth/data/registration-options";
import { savePatientProfile } from "@/features/settings/actions/save-patient-profile";
import type { PatientProfile } from "@/features/settings/data/patient-profile";
import { bloodGroups } from "@/features/settings/schemas/patient-profile";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type PersonalInfoFormProps = {
  profile: PatientProfile;
};

function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="grid items-start gap-4 sm:grid-cols-2">
      <legend className="mb-3 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

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

  const select = (
    name: "gender" | "bloodGroup",
    label: string,
    options: readonly string[],
  ) => {
    const id = `patient-${name}`;
    return (
      <FormField id={id} label={label} error={fieldError(name)}>
        <NativeSelect
          id={id}
          name={name}
          defaultValue={profile[name] ?? ""}
          className="w-full"
        >
          <NativeSelectOption value="">Not specified</NativeSelectOption>
          {options.map((option) => (
            <NativeSelectOption key={option} value={option}>
              {option}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FormField>
    );
  };

  const list = (
    name: "allergies" | "chronicConditions" | "currentMedicines",
    label: string,
    hint: string,
  ) => {
    const id = `patient-${name}`;
    return (
      <FormField
        id={id}
        label={label}
        hint={hint}
        error={fieldError(name)}
        className="sm:col-span-2"
      >
        <Textarea
          id={id}
          name={name}
          rows={2}
          defaultValue={profile[name].join(", ")}
          {...fieldErrorProps(id, fieldError(name))}
        />
      </FormField>
    );
  };

  return (
    <PanelCard
      title="Personal information"
      description="Your name and phone number are shared with doctors you book."
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
          {select("gender", "Gender", genders)}
          <FormField
            id="patient-homeAddress"
            label="Home address"
            hint="Used for home sample collection."
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
          <FormSection title="Medical profile">
            {select("bloodGroup", "Blood group", bloodGroups)}
            <div className="grid grid-cols-2 gap-4">
              {input("heightCm", "Height (cm)", {
                type: "number",
                inputMode: "numeric",
                min: 30,
                max: 272,
              })}
              {input("weightKg", "Weight (kg)", {
                type: "number",
                inputMode: "decimal",
                step: "0.1",
                min: 0.5,
                max: 500,
              })}
            </div>
            {list(
              "allergies",
              "Allergies",
              "Separate with commas, for example: penicillin, peanuts.",
            )}
            {list(
              "chronicConditions",
              "Ongoing conditions",
              "Separate with commas, for example: diabetes, asthma.",
            )}
            {list(
              "currentMedicines",
              "Medicines you take now",
              "Include any your MedEase doctors didn't prescribe.",
            )}
          </FormSection>
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
