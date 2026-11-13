"use server";

import { refresh } from "next/cache";
import { after } from "next/server";

import {
  labBookingMoveErrorMessages,
  statusLabels,
} from "@/features/lab-booking/lib/lab-bookings";
import { moveLabBookingSchema } from "@/features/lab-booking/schemas/lab-booking";
import { sendDueRefunds } from "@/features/payments/lib/process-payments.server";
import { requireLabMember } from "@/features/lab-staff/lib/lab-member.server";
import { databaseErrorState } from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import {
  isRateLimited,
  RATE_LIMITED_MESSAGE,
  rateLimits,
} from "@/lib/rate-limit.server";
import { createClient } from "@/lib/supabase/server";

// The lab moves a booking to its next status (LAB-04). The database checks
// the move, the day and the reason, and tells the patient.
export const moveLabBooking = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = moveLabBookingSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    const { user } = await requireLabMember("bookings.view");
    if (await isRateLimited(rateLimits.labBookingMoveUser, user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const move = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.rpc("move_lab_booking", {
      p_booking_id: move.bookingId,
      p_from_status: move.fromStatus,
      p_to_status: move.toStatus,
      p_reason: move.reason,
      p_note: move.note,
    });
    if (error) {
      // Someone else moved it: show where it is now.
      if (error.message === "status_changed") refresh();
      return databaseErrorState(
        error,
        labBookingMoveErrorMessages,
        "Lab booking move",
      );
    }

    // A paid booking's refund was queued with the cancellation: send it now
    // rather than at the next scheduled run.
    if (move.toStatus === "cancelled")
      after(() => sendDueRefunds().catch(() => undefined));

    refresh();
    return {
      status: "success",
      message: `Marked as ${statusLabels[move.toStatus].toLowerCase()}.`,
    };
  },
);
