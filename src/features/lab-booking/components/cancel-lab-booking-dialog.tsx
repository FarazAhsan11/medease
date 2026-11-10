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
import { cancelLabBooking } from "@/features/lab-booking/actions/cancel-lab-booking";
import { LabBookingReasonFields } from "@/features/lab-booking/components/lab-booking-reason-fields";
import { patientCancelReasons } from "@/features/lab-booking/lib/lab-bookings";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type CancelLabBookingDialogProps = {
  bookingId: string;
  // "Chughtai Lab · CBC, HbA1c"
  summary: string;
};

// The patient cancels a booking before the sample is taken (LAB-20).
export function CancelLabBookingDialog(props: CancelLabBookingDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          />
        }
      >
        Cancel booking
      </AlertDialogTrigger>
      <AlertDialogContent>
        {/* Mounted per opening, so each one starts with an empty form. */}
        <CancelForm {...props} onDone={() => setOpen(false)} />
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CancelForm({
  bookingId,
  summary,
  onDone,
}: CancelLabBookingDialogProps & { onDone: () => void }) {
  const [reason, setReason] = useState("");
  const { pending, onSubmit, fieldError } = useFormAction(
    cancelLabBooking,
    initialFormState,
    { onSuccess: onDone },
  );

  return (
    <form method="post" onSubmit={onSubmit} className="grid gap-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <AlertDialogHeader>
        <AlertDialogTitle>Cancel this lab booking?</AlertDialogTitle>
        <AlertDialogDescription>
          {summary}. We&apos;ll let the lab know, and this can&apos;t be undone.
          If you&apos;ve already paid the lab, ask them for your money back.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <LabBookingReasonFields
        reasons={patientCancelReasons}
        reason={reason}
        onReasonChange={setReason}
        noteLabel="Note for the lab"
        noteRequired={reason === "other"}
        placeholder="e.g. My doctor changed the tests."
        reasonError={fieldError("reason")}
        noteError={fieldError("note")}
      />
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>Keep booking</AlertDialogCancel>
        <Button
          type="submit"
          variant="destructive"
          disabled={pending}
          className="gap-2"
        >
          {pending && <Loader2Icon className="animate-spin" aria-hidden />}
          {pending ? "Cancelling…" : "Cancel booking"}
        </Button>
      </AlertDialogFooter>
    </form>
  );
}
