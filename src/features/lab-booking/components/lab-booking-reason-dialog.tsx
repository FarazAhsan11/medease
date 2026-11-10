"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";

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
import { moveLabBooking } from "@/features/lab-booking/actions/move-lab-booking";
import { LabBookingReasonFields } from "@/features/lab-booking/components/lab-booking-reason-fields";
import {
  cancelReasons,
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
  const [reason, setReason] = useState("");
  const { pending, onSubmit, fieldError } = useFormAction(
    moveLabBooking,
    initialFormState,
    { onSuccess: onDone },
  );
  const text = copy[toStatus];
  const cancelling = toStatus === "cancelled";

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
      <LabBookingReasonFields
        reasons={text.reasons}
        reason={reason}
        onReasonChange={setReason}
        noteLabel="Note for the patient"
        noteRequired={reason === "other"}
        placeholder={
          cancelling
            ? "e.g. Called on Monday; the patient will book again next week."
            : "e.g. We'll call you to arrange a visit tomorrow morning."
        }
        reasonError={fieldError("reason")}
        noteError={fieldError("note")}
      />
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
