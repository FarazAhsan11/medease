"use client";

import { ArrowRightIcon, Loader2Icon } from "lucide-react";

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
};

// The booking's next step, in one click. Report ready comes with the report
// (UploadReportDialog) instead.
export function LabBookingForwardButton({
  bookingId,
  fromStatus,
  toStatus,
}: LabBookingForwardButtonProps) {
  const { pending, onSubmit } = useFormAction(moveLabBooking, initialFormState);

  return (
    <form method="post" onSubmit={onSubmit}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="fromStatus" value={fromStatus} />
      <input type="hidden" name="toStatus" value={toStatus} />
      <Button type="submit" size="sm" disabled={pending} className="gap-1.5">
        {pending ? (
          <Loader2Icon className="animate-spin" aria-hidden />
        ) : (
          <ArrowRightIcon aria-hidden />
        )}
        {forwardLabels[toStatus] ?? toStatus}
      </Button>
    </form>
  );
}
