"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { payLabBookingSchema } from "@/features/lab-booking/schemas/lab-booking";
import { paymentErrorMessages } from "@/features/payments/lib/payments";
import { startLabCheckout } from "@/features/payments/lib/start-lab-checkout.server";
import { requireRole } from "@/lib/auth/session";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import {
  isRateLimited,
  RATE_LIMITED_MESSAGE,
  rateLimits,
} from "@/lib/rate-limit.server";
import { UNEXPECTED_ERROR_MESSAGE } from "@/lib/errors";

// "Pay now" on a booking waiting for payment (PAY-07): opens the checkout,
// reusing one already open.
export const payLabBooking = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = payLabBookingSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    const user = await requireRole("patient");
    if (await isRateLimited(rateLimits.paymentStartUser, user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const checkout = await startLabCheckout(parsed.data.bookingId);
    if ("url" in checkout) redirect(checkout.url);

    // Paid or lapsed meanwhile: show where it is now.
    if (
      [
        "already_paid",
        "not_awaiting_payment",
        "payment_window_closed",
      ].includes(checkout.error)
    ) {
      refresh();
    }
    const message = paymentErrorMessages[checkout.error];
    if (!message) console.error("Starting a payment failed:", checkout.error);
    return formError(message ?? UNEXPECTED_ERROR_MESSAGE, checkout.error);
  },
);
