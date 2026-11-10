"use server";

import { refresh } from "next/cache";

import { labBookingChangeErrorMessages } from "@/features/lab-booking/lib/lab-bookings";
import { cancelLabBookingSchema } from "@/features/lab-booking/schemas/lab-booking";
import { requireRole } from "@/lib/auth/session";
import { databaseErrorState } from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import {
  isRateLimited,
  RATE_LIMITED_MESSAGE,
  rateLimits,
} from "@/lib/rate-limit.server";
import { createClient } from "@/lib/supabase/server";

// The patient cancels a lab booking until the sample is taken (LAB-20). The
// database checks the booking is theirs and still open, and tells the lab.
export const cancelLabBooking = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = cancelLabBookingSchema.safeParse(
      Object.fromEntries(formData),
    );
    if (!parsed.success) return validationError(parsed.error);

    const user = await requireRole("patient");
    if (await isRateLimited(rateLimits.labBookingChangeUser, user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("cancel_lab_booking", {
      p_booking_id: parsed.data.bookingId,
      p_reason: parsed.data.reason,
      p_note: parsed.data.note,
    });
    if (error) {
      // The lab moved it meanwhile: show where it is now.
      if (error.message === "not_changeable") refresh();
      return databaseErrorState(
        error,
        labBookingChangeErrorMessages,
        "Lab booking cancel",
      );
    }

    refresh();
    return { status: "success", message: "Booking cancelled." };
  },
);
