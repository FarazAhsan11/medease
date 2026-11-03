"use client";

import { EyeIcon, Loader2Icon } from "lucide-react";

import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveVisitSummary } from "@/features/visit-summaries/actions/save-visit-summary";
import {
  MAX_ADVICE,
  MAX_DIAGNOSIS,
  type VisitSummary,
} from "@/features/visit-summaries/lib/visit-summaries";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type VisitSummaryFormProps = {
  appointmentId: string;
  summary: VisitSummary | null;
  // Date keys bounding the follow-up date, in the doctor's timezone.
  followUpMin: string;
  followUpMax: string;
};

export function VisitSummaryForm({
  appointmentId,
  summary,
  followUpMin,
  followUpMax,
}: VisitSummaryFormProps) {
  const { pending, onSubmit, fieldError } = useFormAction(
    saveVisitSummary,
    initialFormState,
  );
  const id = (field: string) => `summary-${field}-${appointmentId}`;

  return (
    <form
      method="post"
      // Remount with the saved values after a save or refresh.
      key={summary?.updatedAt ?? "new"}
      onSubmit={onSubmit}
      className="grid gap-3"
      noValidate
    >
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <FormField
        id={id("diagnosis")}
        label="Diagnosis"
        error={fieldError("diagnosis")}
      >
        <Input
          id={id("diagnosis")}
          name="diagnosis"
          maxLength={MAX_DIAGNOSIS}
          defaultValue={summary?.diagnosis ?? ""}
          {...fieldErrorProps(id("diagnosis"), fieldError("diagnosis"))}
        />
      </FormField>
      <FormField id={id("advice")} label="Advice" error={fieldError("advice")}>
        <Textarea
          id={id("advice")}
          name="advice"
          rows={4}
          maxLength={MAX_ADVICE}
          defaultValue={summary?.advice ?? ""}
          placeholder="Rest, fluids, what to watch for…"
          {...fieldErrorProps(id("advice"), fieldError("advice"))}
        />
      </FormField>
      <FormField
        id={id("follow-up")}
        label="Follow-up on (optional)"
        error={fieldError("followUpOn")}
      >
        <Input
          id={id("follow-up")}
          name="followUpOn"
          type="date"
          min={followUpMin}
          max={followUpMax}
          defaultValue={summary?.followUpOn ?? ""}
          className="w-fit"
          {...fieldErrorProps(id("follow-up"), fieldError("followUpOn"))}
        />
      </FormField>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <EyeIcon className="size-3" aria-hidden />
        The patient sees this summary in the app.
      </p>
      <Button
        type="submit"
        size="sm"
        disabled={pending}
        className="w-fit gap-1.5"
      >
        {pending && <Loader2Icon className="animate-spin" aria-hidden />}
        {pending ? "Saving…" : summary ? "Update summary" : "Save summary"}
      </Button>
    </form>
  );
}
