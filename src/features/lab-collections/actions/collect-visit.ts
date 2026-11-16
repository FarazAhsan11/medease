"use server";

import { refresh } from "next/cache";

import {
  cashErrorMessages,
  staleCashCodes,
} from "@/features/lab-collections/lib/collections";
import { collectVisitSchema } from "@/features/lab-collections/schemas/collections";
import { findLabMember } from "@/features/lab-staff/lib/lab-member.server";
import { databaseErrorState } from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import {
  isRateLimited,
  RATE_LIMITED_MESSAGE,
  rateLimits,
} from "@/lib/rate-limit.server";
import { createClient } from "@/lib/supabase/server";

// The collector marks a home visit collected and, on a cash booking, the cash
// taken, in one database call so neither half is lost (LAB-21).
export const collectVisit = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = collectVisitSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    const member = await findLabMember("bookings.collect");
    if (!member) return formError(cashErrorMessages.not_permitted);
    if (await isRateLimited(rateLimits.labBookingMoveUser, member.user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const { bookingId, fromStatus, cashTaken, amount } = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.rpc("collect_lab_booking", {
      p_booking_id: bookingId,
      p_from_status: fromStatus,
      p_cash_amount: cashTaken ? amount : undefined,
    });
    if (error) {
      if (staleCashCodes.has(error.message)) refresh();
      return databaseErrorState(error, cashErrorMessages, "Collect visit");
    }

    refresh();
    return {
      status: "success",
      message: cashTaken
        ? "Marked as collected, with the cash taken."
        : "Marked as collected.",
    };
  },
);
