import {
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  CreditCardIcon,
  RotateCcwIcon,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { patientRoutes } from "@/config/routes";
import type { LabBooking } from "@/features/lab-booking/lib/lab-bookings";
import { PayLabBookingButton } from "@/features/payments/components/pay-lab-booking-button";
import type { PaymentAttemptStatus } from "@/features/payments/lib/payments";
import { formatTime } from "@/lib/datetime";

type LabBookingPaymentStatusProps = {
  booking: LabBooking;
  // The newest checkout attempt, if any.
  attempt: PaymentAttemptStatus | null;
};

// Where a booking's payment stands, after the checkout or from "Pay now"
// (PAY-07). Only the provider's webhook changes it, never this page.
export function LabBookingPaymentStatus({
  booking,
  attempt,
}: LabBookingPaymentStatusProps) {
  const backToList = (
    <Link
      href={patientRoutes.labTests}
      className={buttonVariants({ variant: "outline" })}
    >
      Back to lab tests
    </Link>
  );

  if (booking.status === "awaiting_payment") {
    const until = booking.paymentDueAt
      ? formatTime(booking.paymentDueAt, booking.timezone)
      : null;
    const by = until ? ` by ${until}` : "";

    if (attempt === "pending") {
      return (
        <EmptyState
          icon={ClockIcon}
          title="Confirming your payment"
          description={`If you've paid, this page updates by itself once the payment is confirmed. If you closed the payment page, open it again and pay${by}.`}
          action={
            <PayLabBookingButton
              bookingId={booking.id}
              label="Open payment page"
              size="default"
            />
          }
        />
      );
    }
    return (
      <EmptyState
        icon={attempt === "failed" ? CircleXIcon : CreditCardIcon}
        title={
          attempt === "failed"
            ? "The payment didn't go through"
            : "Pay to confirm your booking"
        }
        description={
          attempt === "failed"
            ? `Nothing was taken. Try again${by}, or cancel the booking from your lab tests.`
            : `Your booking is held until ${until ?? "the time runs out"}. The lab gets it once you've paid.`
        }
        action={
          <PayLabBookingButton
            bookingId={booking.id}
            label={attempt === "failed" ? "Try again" : "Pay now"}
            size="default"
          />
        }
      />
    );
  }

  const refund =
    booking.paymentStatus === "refund_pending"
      ? " Your payment is being refunded in full, the way you paid."
      : booking.paymentStatus === "refunded"
        ? " Your payment has been refunded in full."
        : "";

  if (booking.status === "cancelled") {
    const lapsed = booking.cancelledBy === "system";
    return (
      <EmptyState
        icon={refund ? RotateCcwIcon : CircleXIcon}
        title={lapsed ? "The time to pay ran out" : "This booking is cancelled"}
        description={
          lapsed
            ? `We released the booking because the payment wasn't completed in time.${refund || " Nothing was taken."}`
            : `This booking was cancelled.${refund}`
        }
        action={
          lapsed ? (
            <Link
              href={patientRoutes.bookLab(booking.labId)}
              className={buttonVariants()}
            >
              Book again
            </Link>
          ) : (
            backToList
          )
        }
      />
    );
  }

  return (
    <EmptyState
      icon={CircleCheckIcon}
      title={
        booking.paymentMethod === "online"
          ? "Paid. Your booking is confirmed"
          : "Your booking is confirmed"
      }
      description={
        booking.paymentMethod === "online"
          ? "The lab has your booking. You can follow it from your lab tests."
          : "You pay in cash at the lab or to the collector."
      }
      action={backToList}
    />
  );
}
