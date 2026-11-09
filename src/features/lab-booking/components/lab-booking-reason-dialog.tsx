"use client";

import { Loader2Icon } from "lucide-react";
import { useId, useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { moveLabBooking } from "@/features/lab-booking/actions/move-lab-booking";
import {
  cancelReasons,
  MAX_STATUS_NOTE,
  reasonLabels,
  recollectionReasons,
  type LabBookingStatus,
} from "@/features/lab-booking/lib/lab-bookings";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

const copy = {
  recollection_needed: {
    trigger: "New sample needed",
    title: "Ask for a new sample?",
    description:
      "The patient sees the reason and your note, and you arrange a new sample with them. The booking goes back to “To collect”.",
    submit: "Ask for a new sample",
    reasons: recollectionReasons,
  },
  cancelled: {
    trigger: "Cancel",
    title: "Cancel this booking?",
    description:
      "The patient sees the reason and your note. A home collection frees its place in the window. This can't be undone.",
    submit: "Cancel booking",
    reasons: cancelReasons,
  },
} as const;

type LabBookingReasonDialogProps = {
  bookingId: string;
  fromStatus: LabBookingStatus;
  toStatus: keyof typeof copy;
  // "Ali Raza · CBC, HbA1c"
  summary: string;
};

// A move that needs a reason: a new sample, or cancelling the booking.
export function LabBookingReasonDialog(props: LabBookingReasonDialogProps) {
  const [open, setOpen] = useState(false);
  const cancelling = props.toStatus === "cancelled";

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant={cancelling ? "ghost" : "outline"}
            size="sm"
            className={
              cancelling
                ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
                : undefined
            }
          />
        }
      >
        {copy[props.toStatus].trigger}
      </AlertDialogTrigger>
      <AlertDialogContent>
        {/* Mounted per opening, so each one starts with an empty form. */}
        <ReasonForm {...props} onDone={() => setOpen(false)} />
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ReasonForm({
  bookingId,
  fromStatus,
  toStatus,
  summary,
  onDone,
}: LabBookingReasonDialogProps & { onDone: () => void }) {
  const id = useId();
  const [reason, setReason] = useState("");
  const { pending, onSubmit, fieldError } = useFormAction(
    moveLabBooking,
    initialFormState,
    { onSuccess: onDone },
  );
  const text = copy[toStatus];
  const cancelling = toStatus === "cancelled";
  const reasonError = fieldError("reason");
  const noteError = fieldError("note");

  return (
    <form method="post" onSubmit={onSubmit} className="grid gap-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="fromStatus" value={fromStatus} />
      <input type="hidden" name="toStatus" value={toStatus} />
      <AlertDialogHeader>
        <AlertDialogTitle>{text.title}</AlertDialogTitle>
        <AlertDialogDescription>
          {summary}. {text.description}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-reason`}>Reason</Label>
        <NativeSelect
          id={`${id}-reason`}
          name="reason"
          required
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          aria-invalid={reasonError ? true : undefined}
          className="w-full"
        >
          <NativeSelectOption value="" disabled>
            Choose a reason
          </NativeSelectOption>
          {text.reasons.map((value) => (
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
          Note for the patient{" "}
          {reason !== "other" && (
            <span className="text-muted-foreground">(optional)</span>
          )}
        </Label>
        <Textarea
          id={`${id}-note`}
          name="note"
          rows={3}
          maxLength={MAX_STATUS_NOTE}
          required={reason === "other"}
          aria-invalid={noteError ? true : undefined}
          placeholder={
            cancelling
              ? "e.g. Called on Monday; the patient will book again next week."
              : "e.g. We'll call you to arrange a visit tomorrow morning."
          }
        />
        {noteError && <p className="text-xs text-destructive">{noteError}</p>}
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>Back</AlertDialogCancel>
        <Button
          type="submit"
          variant={cancelling ? "destructive" : "default"}
          disabled={pending}
          className="gap-2"
        >
          {pending && <Loader2Icon className="animate-spin" aria-hidden />}
          {text.submit}
        </Button>
      </AlertDialogFooter>
    </form>
  );
}
