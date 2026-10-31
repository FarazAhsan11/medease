"use client";

import { Loader2Icon } from "lucide-react";
import { useRef } from "react";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addTimeOff } from "@/features/doctor-dashboard/actions/time-off";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

export function TimeOffForm({ today }: { today: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const { pending, onSubmit, fieldError } = useFormAction(
    addTimeOff,
    initialFormState,
    { onSuccess: () => formRef.current?.reset() },
  );

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="grid items-start gap-4 sm:grid-cols-[1fr_1fr_auto]"
      noValidate
    >
      <FormField
        id="time-off-start"
        label="First day"
        error={fieldError("startsOn")}
      >
        <Input
          id="time-off-start"
          name="startsOn"
          type="date"
          min={today}
          required
          {...fieldErrorProps("time-off-start", fieldError("startsOn"))}
        />
      </FormField>
      <FormField
        id="time-off-end"
        label="Last day"
        error={fieldError("endsOn")}
      >
        <Input
          id="time-off-end"
          name="endsOn"
          type="date"
          min={today}
          required
          {...fieldErrorProps("time-off-end", fieldError("endsOn"))}
        />
      </FormField>
      <Button type="submit" disabled={pending} className="gap-2 sm:mt-6">
        {pending && <Loader2Icon className="animate-spin" aria-hidden />}
        {pending ? "Adding…" : "Add time off"}
      </Button>
    </form>
  );
}
