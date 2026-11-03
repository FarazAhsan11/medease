"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

import { saveMedicineReminders } from "../actions/save-medicine-reminders";
import type { MedicineReminderSettings } from "../lib/medicine-reminders";

type MedicineRemindersFormProps = {
  settings: MedicineReminderSettings;
  timezones: string[];
};

const doseTimes = [
  { name: "morning", label: "Morning" },
  { name: "afternoon", label: "Afternoon" },
  { name: "night", label: "Night" },
] as const;

export function MedicineRemindersForm({
  settings,
  timezones,
}: MedicineRemindersFormProps) {
  // The fields own their values once mounted. Saving refreshes the page with the
  // same values, and uncontrolled fields can't take new defaults.
  const [initial] = useState(settings);
  const { pending, onSubmit, fieldError } = useFormAction(
    saveMedicineReminders,
    initialFormState,
  );

  return (
    <form
      method="post"
      onSubmit={onSubmit}
      className="grid gap-4 p-5"
      noValidate
    >
      <div className="flex items-start justify-between gap-4 rounded-xl bg-muted p-3">
        <div>
          <label
            htmlFor="medicine-reminders-enabled"
            className="text-sm font-medium"
          >
            Email me at dose times
          </label>
          <p className="text-xs text-muted-foreground">
            Only on days you have a dose due.
          </p>
        </div>
        <Switch
          id="medicine-reminders-enabled"
          name="enabled"
          defaultChecked={initial.enabled}
        />
      </div>

      <div className="grid items-start gap-4 sm:grid-cols-3">
        {doseTimes.map(({ name, label }) => {
          const id = `medicine-reminders-${name}`;
          return (
            <FormField
              key={name}
              id={id}
              label={label}
              error={fieldError(name)}
            >
              <Input
                id={id}
                name={name}
                type="time"
                defaultValue={initial[name]}
                {...fieldErrorProps(id, fieldError(name))}
              />
            </FormField>
          );
        })}
      </div>

      <FormField
        id="medicine-reminders-timezone"
        label="Time zone"
        error={fieldError("timezone")}
      >
        <NativeSelect
          id="medicine-reminders-timezone"
          name="timezone"
          defaultValue={initial.timezone}
          className="w-full"
        >
          {timezones.map((zone) => (
            <NativeSelectOption key={zone} value={zone}>
              {zone}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FormField>

      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        className="w-fit gap-2"
      >
        {pending && <Loader2Icon className="animate-spin" aria-hidden />}
        {pending ? "Saving…" : "Save reminders"}
      </Button>
    </form>
  );
}
