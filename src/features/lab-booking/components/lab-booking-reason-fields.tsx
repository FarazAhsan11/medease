"use client";

import { useId } from "react";

import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_STATUS_NOTE,
  reasonLabels,
  type StatusReason,
} from "@/features/lab-booking/lib/lab-bookings";

type LabBookingReasonFieldsProps = {
  reasons: readonly StatusReason[];
  reason: string;
  onReasonChange: (reason: string) => void;
  noteLabel: string;
  // "Other" needs a note.
  noteRequired: boolean;
  placeholder: string;
  reasonError?: string;
  noteError?: string;
};

// A reason from a fixed list and an optional note, for cancelling a booking
// or asking for a new sample.
export function LabBookingReasonFields({
  reasons,
  reason,
  onReasonChange,
  noteLabel,
  noteRequired,
  placeholder,
  reasonError,
  noteError,
}: LabBookingReasonFieldsProps) {
  const id = useId();

  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-reason`}>Reason</Label>
        <NativeSelect
          id={`${id}-reason`}
          name="reason"
          required
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          aria-invalid={reasonError ? true : undefined}
          className="w-full"
        >
          <NativeSelectOption value="" disabled>
            Choose a reason
          </NativeSelectOption>
          {reasons.map((value) => (
            <NativeSelectOption key={value} value={value}>
              {reasonLabels[value]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {reasonError && (
          <p className="text-xs text-destructive">{reasonError}</p>
        )}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-note`}>
          {noteLabel}{" "}
          {!noteRequired && (
            <span className="text-muted-foreground">(optional)</span>
          )}
        </Label>
        <Textarea
          id={`${id}-note`}
          name="note"
          rows={3}
          maxLength={MAX_STATUS_NOTE}
          required={noteRequired}
          aria-invalid={noteError ? true : undefined}
          placeholder={placeholder}
        />
        {noteError && <p className="text-xs text-destructive">{noteError}</p>}
      </div>
    </>
  );
}
