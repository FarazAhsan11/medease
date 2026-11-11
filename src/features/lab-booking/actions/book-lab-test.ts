"use server";

import { redirect } from "next/navigation";

import { patientRoutes } from "@/config/routes";
import { labBookingErrorMessages } from "@/features/lab-booking/lib/lab-bookings";
import { bookLabTestSchema } from "@/features/lab-booking/schemas/lab-booking";
import { onlinePaymentsEnabled } from "@/features/payments/lib/payment-provider.server";
import { paymentErrorMessages } from "@/features/payments/lib/payments";
import { startLabCheckout } from "@/features/payments/lib/start-lab-checkout.server";
import { requireRole } from "@/lib/auth/session";
import { databaseErrorState } from "@/lib/database-errors";
import { setFlash } from "@/lib/flash.server";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import {
  isRateLimited,
  RATE_LIMITED_MESSAGE,
  rateLimits,
} from "@/lib/rate-limit.server";
import { createClient } from "@/lib/supabase/server";

// The database function re-checks everything (items, collection rules, the
// window's capacity); this action validates input and handles the response.
// A repeated request id returns the booking already made, so a retry is safe.
// Paying online holds the booking and goes to the provider's checkout
// (PAY-07); only its webhook confirms the booking.
export const bookLabTest = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = bookLabTestSchema.safeParse({
      ...Object.fromEntries(formData),
      labTestIds: formData.getAll("labTestIds"),
      packageIds: formData.getAll("packageIds"),
    });
    if (!parsed.success) return validationError(parsed.error);

    const user = await requireRole("patient");
    if (await isRateLimited(rateLimits.labBookingUser, user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const booking = parsed.data;
    const online = booking.paymentMethod === "online";
    if (online && !onlinePaymentsEnabled()) {
      return formError(paymentErrorMessages.payments_off, "payments_off");
    }

    const home = booking.collection === "home";
    const supabase = await createClient();
    const { data: bookingId, error } = await supabase.rpc("book_lab_test", {
      p_request_id: booking.requestId,
      p_lab_id: booking.labId,
      p_lab_test_ids: booking.labTestIds,
      p_package_ids: booking.packageIds,
      p_collection: booking.collection,
      p_visit_date: home ? null : booking.visitDate,
      p_slot_starts_at: home ? booking.slotStartsAt : null,
      p_address_id: home ? booking.addressId : null,
      p_care_recipient_id: booking.careRecipientId,
      p_payment_method: booking.paymentMethod,
    });
    if (error) {
      return databaseErrorState(error, labBookingErrorMessages, "Lab booking");
    }

    if (online) {
      const checkout = await startLabCheckout(bookingId as string);
      // The booking is held either way; its page offers to pay again.
      if ("url" in checkout) redirect(checkout.url);
      await setFlash(
        "error",
        paymentErrorMessages[checkout.error] ??
          paymentErrorMessages.checkout_failed,
      );
      redirect(patientRoutes.labBookingPayment(bookingId as string));
    }

    // Generic on purpose: the flash cookie is readable in the browser. The
    // lab tests page shows the details.
    await setFlash("success", "Your lab test is booked.");
    redirect(patientRoutes.labTests);
  },
);
