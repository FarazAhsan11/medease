import type { ComponentProps } from "react";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { FormSection } from "@/components/shared/form-section";
import { SelectField } from "@/components/shared/select-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { MedicalProfileValues } from "@/features/medical-profile/lib/medical-profile";
import { bloodGroups } from "@/features/medical-profile/schemas/medical-profile";

type MedicalProfileFieldsProps = {
  // Field ids are `<idPrefix>-<name>`.
  idPrefix: string;
  values: MedicalProfileValues | null;
  fieldError: (name: string) => string | undefined;
  medicinesLabel?: string;
};

// The medical part of a profile form, for the account holder or a family
// member. Doctors see these details while the person has a visit with them.
export function MedicalProfileFields({
  idPrefix,
  values,
  fieldError,
  medicinesLabel = "Medicines taken now",
}: MedicalProfileFieldsProps) {
  const number = (
    name: "heightCm" | "weightKg",
    label: string,
    props: ComponentProps<typeof Input>,
  ) => {
    const id = `${idPrefix}-${name}`;
    return (
      <FormField id={id} label={label} error={fieldError(name)}>
        <Input
          id={id}
          name={name}
          type="number"
          defaultValue={values?.[name] ?? ""}
          {...fieldErrorProps(id, fieldError(name))}
          {...props}
        />
      </FormField>
    );
  };

  const list = (
    name: "allergies" | "chronicConditions" | "currentMedicines",
    label: string,
    hint: string,
  ) => {
    const id = `${idPrefix}-${name}`;
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
          defaultValue={values?.[name].join(", ") ?? ""}
          {...fieldErrorProps(id, fieldError(name))}
        />
      </FormField>
    );
  };

  return (
    <FormSection title="Medical profile">
      <SelectField
        id={`${idPrefix}-bloodGroup`}
        name="bloodGroup"
        label="Blood group"
        options={bloodGroups}
        defaultValue={values?.bloodGroup}
        error={fieldError("bloodGroup")}
      />
      <div className="grid grid-cols-2 gap-4">
        {number("heightCm", "Height (cm)", {
          inputMode: "numeric",
          min: 30,
          max: 272,
        })}
        {number("weightKg", "Weight (kg)", {
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
        medicinesLabel,
        "Include any your MedEase doctors didn't prescribe.",
      )}
    </FormSection>
  );
}
