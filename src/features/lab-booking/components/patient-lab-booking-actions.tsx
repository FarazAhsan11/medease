import { CalendarClockIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { patientRoutes } from "@/config/routes";
import { CancelLabBookingDialog } from "@/features/lab-booking/components/cancel-lab-booking-dialog";
import {
  canPatientCancel,
  canReschedule,
  itemsSummary,
  MAX_RESCHEDULES,
  type LabBooking,
} from "@/features/lab-booking/lib/lab-bookings";
import { PayLabBookingButton } from "@/features/payments/components/pay-lab-booking-button";

type PatientLabBookingActionsProps = {
  booking: LabBooking;
};

function cancelConsequence(booking: LabBooking) {
  if (booking.status === "awaiting_payment") {
    return "Nothing has been paid and the lab hasn't been sent it yet. This can't be undone.";
  }
  if (booking.paymentStatus === "paid") {
    return "We'll let the lab know and refund the full amount the way you paid. This can't be undone.";
  }
  return "We'll let the lab know, and this can't be undone. If you've already paid the lab, ask them for your money back.";
}

// Until the sample is taken, the patient can move the booking or cancel it
// (LAB-20); one waiting for payment can be paid or dropped (PAY-07). The
// database checks each.
export function PatientLabBookingActions({
  booking,
}: PatientLabBookingActionsProps) {
  if (!canPatientCancel(booking)) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {booking.status === "awaiting_payment" ? (
        <PayLabBookingButton bookingId={booking.id} />
      ) : canReschedule(booking) ? (
        <Link
          href={patientRoutes.rescheduleLabBooking(booking.id)}
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: "gap-1.5",
          })}
        >
          <CalendarClockIcon aria-hidden />
          Change time
        </Link>
      ) : (
        <p className="text-xs text-muted-foreground">
          Moved {MAX_RESCHEDULES} times already. To change it again, call the
          lab.
        </p>
      )}
      <CancelLabBookingDialog
        bookingId={booking.id}
        summary={`${booking.labName} · ${itemsSummary(booking.items)}`}
        consequence={cancelConsequence(booking)}
      />
    </div>
  );
}
