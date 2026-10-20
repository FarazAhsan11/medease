"use client";

import { Trash2Icon } from "lucide-react";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  DOSE_TIMES,
  FREQUENCIES,
  MEAL_TIMINGS,
  MEDICINE_FORMS,
  doseTimeLabels,
  frequencyLabels,
  mealTimingLabels,
  medicineFormLabels,
  type DoseTime,
  type Frequency,
  type MealTiming,
  type MedicineForm,
} from "@/features/prescriptions/lib/prescriptions";

// One medicine while it's being edited. Inputs hold raw text; the form turns
// rows into the payload when it's sent.
export type MedicineDraft = {
  key: string;
  medicine: string;
  strength: string;
  form: MedicineForm;
  dose: string;
  frequency: Frequency;
  doseTimes: DoseTime[];
  meal: MealTiming;
  durationDays: string;
  instructions: string;
};

type MedicineRowFieldsProps = {
  number: number;
  row: MedicineDraft;
  error: (field: string) => string | undefined;
  onChange: (patch: Partial<MedicineDraft>) => void;
  onRemove?: () => void;
};

// Inputs have no `name`: the form sends every row as one JSON field.
export function MedicineRowFields({
  number,
  row,
  error,
  onChange,
  onRemove,
}: MedicineRowFieldsProps) {
  const id = (field: string) => `rx-${row.key}-${field}`;
  const timesError = error("doseTimes");

  return (
    <fieldset className="grid gap-4 rounded-xl border p-4">
      <legend className="sr-only">Medicine {number}</legend>
      <div className="flex min-h-8 items-center justify-between gap-2">
        <p aria-hidden className="text-sm font-semibold">
          Medicine {number}
        </p>
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2Icon aria-hidden />
            Remove
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id={id("medicine")}
          label="Medicine name"
          error={error("medicine")}
        >
          <Input
            id={id("medicine")}
            value={row.medicine}
            onChange={(event) => onChange({ medicine: event.target.value })}
            maxLength={100}
            placeholder="e.g. Amoxicillin"
            autoComplete="off"
            {...fieldErrorProps(id("medicine"), error("medicine"))}
          />
        </FormField>
        <FormField
          id={id("strength")}
          label="Strength (optional)"
          error={error("strength")}
        >
          <Input
            id={id("strength")}
            value={row.strength}
            onChange={(event) => onChange({ strength: event.target.value })}
            maxLength={40}
            placeholder="e.g. 500 mg"
            autoComplete="off"
            {...fieldErrorProps(id("strength"), error("strength"))}
          />
        </FormField>
        <FormField id={id("form")} label="Form" error={error("form")}>
          <NativeSelect
            id={id("form")}
            value={row.form}
            onChange={(event) =>
              onChange({ form: event.target.value as MedicineForm })
            }
            className="w-full"
            {...fieldErrorProps(id("form"), error("form"))}
          >
            {MEDICINE_FORMS.map((form) => (
              <NativeSelectOption key={form} value={form}>
                {medicineFormLabels[form]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id={id("dose")} label="Dose" error={error("dose")}>
          <Input
            id={id("dose")}
            value={row.dose}
            onChange={(event) => onChange({ dose: event.target.value })}
            maxLength={40}
            placeholder="e.g. 1 tablet, 5 ml"
            autoComplete="off"
            {...fieldErrorProps(id("dose"), error("dose"))}
          />
        </FormField>
        <FormField
          id={id("frequency")}
          label="How often"
          error={error("frequency")}
        >
          <NativeSelect
            id={id("frequency")}
            value={row.frequency}
            onChange={(event) =>
              onChange({ frequency: event.target.value as Frequency })
            }
            className="w-full"
            {...fieldErrorProps(id("frequency"), error("frequency"))}
          >
            {FREQUENCIES.map((frequency) => (
              <NativeSelectOption key={frequency} value={frequency}>
                {frequencyLabels[frequency]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id={id("meal")} label="With food" error={error("meal")}>
          <NativeSelect
            id={id("meal")}
            value={row.meal}
            onChange={(event) =>
              onChange({ meal: event.target.value as MealTiming })
            }
            className="w-full"
            {...fieldErrorProps(id("meal"), error("meal"))}
          >
            {MEAL_TIMINGS.map((meal) => (
              <NativeSelectOption key={meal} value={meal}>
                {mealTimingLabels[meal]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>

        {row.frequency !== "as_needed" && (
          <div
            role="group"
            aria-labelledby={id("times-label")}
            aria-describedby={timesError ? id("times-error") : undefined}
            className="grid gap-1.5 sm:col-span-2"
          >
            <p id={id("times-label")} className="text-sm font-medium">
              Time of day
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {DOSE_TIMES.map((time) => (
                <label
                  key={time}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={row.doseTimes.includes(time)}
                    onCheckedChange={(checked) =>
                      onChange({
                        doseTimes: checked
                          ? [...row.doseTimes, time]
                          : row.doseTimes.filter((value) => value !== time),
                      })
                    }
                    aria-invalid={Boolean(timesError)}
                  />
                  {doseTimeLabels[time]}
                </label>
              ))}
            </div>
            {timesError && (
              <p id={id("times-error")} className="text-xs text-destructive">
                {timesError}
              </p>
            )}
          </div>
        )}

        <FormField
          id={id("durationDays")}
          label="Duration in days"
          hint="Leave empty if it's ongoing."
          error={error("durationDays")}
        >
          <Input
            id={id("durationDays")}
            type="number"
            inputMode="numeric"
            min={1}
            max={365}
            step={1}
            value={row.durationDays}
            onChange={(event) => onChange({ durationDays: event.target.value })}
            placeholder="e.g. 7"
            {...fieldErrorProps(id("durationDays"), error("durationDays"))}
          />
        </FormField>
        <FormField
          id={id("instructions")}
          label="Instructions (optional)"
          error={error("instructions")}
        >
          <Input
            id={id("instructions")}
            value={row.instructions}
            onChange={(event) => onChange({ instructions: event.target.value })}
            maxLength={300}
            placeholder="e.g. Finish the course even if you feel better"
            autoComplete="off"
            {...fieldErrorProps(id("instructions"), error("instructions"))}
          />
        </FormField>
      </div>
    </fieldset>
  );
}
