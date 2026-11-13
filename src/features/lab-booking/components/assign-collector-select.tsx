"use client";

import { useState } from "react";

import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { assignCollector } from "@/features/lab-booking/actions/assign-collector";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState, type FormState } from "@/lib/form-state";

export type CollectorOption = {
  id: string;
  label: string;
};

type AssignCollectorSelectProps = {
  bookingId: string;
  collectorId: string | null;
  options: CollectorOption[];
  // Names the visit for screen readers.
  summary: string;
};

// Saves as soon as someone is picked; the database tells the collector.
export function AssignCollectorSelect({
  bookingId,
  collectorId,
  options,
  summary,
}: AssignCollectorSelectProps) {
  // Counts answers, so the select remounts on the saved choice after each one:
  // a refused pick snaps back even though the saved choice didn't change.
  const [answers, setAnswers] = useState(0);
  const { pending, onSubmit } = useFormAction(
    async (state: FormState, formData: FormData) => {
      try {
        return await assignCollector(state, formData);
      } finally {
        setAnswers((count) => count + 1);
      }
    },
    initialFormState,
  );
  const id = `collector-${bookingId}`;

  return (
    <form method="post" onSubmit={onSubmit}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <label htmlFor={id} className="sr-only">
        Collector for {summary}
      </label>
      <NativeSelect
        id={id}
        name="collectorId"
        key={`${collectorId ?? "none"}-${answers}`}
        defaultValue={collectorId ?? ""}
        disabled={pending}
        size="sm"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        <NativeSelectOption value="">Not assigned</NativeSelectOption>
        {options.map((option) => (
          <NativeSelectOption key={option.id} value={option.id}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </form>
  );
}
