"use client";

import { CreditCardIcon, Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { payLabBooking } from "@/features/payments/actions/pay-lab-booking";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type PayLabBookingButtonProps = {
  bookingId: string;
  label?: string;
  size?: "sm" | "default";
};

// Opens the checkout for a booking waiting for payment (PAY-07).
export function PayLabBookingButton({
  bookingId,
  label = "Pay now",
  size = "sm",
}: PayLabBookingButtonProps) {
  const { pending, onSubmit } = useFormAction(payLabBooking, initialFormState);

  return (
    <form method="post" onSubmit={onSubmit}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <Button type="submit" size={size} disabled={pending} className="gap-1.5">
        {pending ? (
          <Loader2Icon className="animate-spin" aria-hidden />
        ) : (
          <CreditCardIcon aria-hidden />
        )}
        {pending ? "Opening…" : label}
      </Button>
    </form>
  );
}
