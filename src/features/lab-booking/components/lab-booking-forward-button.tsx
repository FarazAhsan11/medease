"use client";

import { ArrowRightIcon, Loader2Icon } from "lucide-react";
import { useState, type ReactNode } from "react";

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
import {
  forwardLabels,
  type LabBookingStatus,
} from "@/features/lab-booking/lib/lab-bookings";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type LabBookingForwardButtonProps = {
  bookingId: string;
  fromStatus: LabBookingStatus;
  toStatus: LabBookingStatus;
  summary: string;
};

// The booking's next step. Report ready tells the patient their report is
// waiting, so it asks first; the other steps go in one click.
export function LabBookingForwardButton({
  bookingId,
  fromStatus,
  toStatus,
  summary,
}: LabBookingForwardButtonProps) {
  const [open, setOpen] = useState(false);
  const { pending, onSubmit } = useFormAction(
    moveLabBooking,
    initialFormState,
    { onSuccess: () => setOpen(false) },
  );
  const label = forwardLabels[toStatus] ?? toStatus;

  const form = (button: ReactNode) => (
    <form method="post" onSubmit={onSubmit}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="fromStatus" value={fromStatus} />
      <input type="hidden" name="toStatus" value={toStatus} />
      {button}
    </form>
  );

  if (toStatus !== "report_ready") {
    return form(
      <Button type="submit" size="sm" disabled={pending} className="gap-1.5">
        {pending ? (
          <Loader2Icon className="animate-spin" aria-hidden />
        ) : (
          <ArrowRightIcon aria-hidden />
        )}
        {label}
      </Button>,
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <ArrowRightIcon aria-hidden />
        {label}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark the report ready?</AlertDialogTitle>
          <AlertDialogDescription>
            {summary}. The patient is told their report is ready. Give it to
            them as you do today until reports can be uploaded here.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {form(
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Back</AlertDialogCancel>
            <Button type="submit" disabled={pending} className="gap-2">
              {pending && <Loader2Icon className="animate-spin" aria-hidden />}
              Report ready
            </Button>
          </AlertDialogFooter>,
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
