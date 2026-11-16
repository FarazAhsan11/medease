"use server";

import { refresh } from "next/cache";

import {
  cashErrorMessages,
  staleCashCodes,
} from "@/features/lab-collections/lib/collections";
import { recordCashSchema } from "@/features/lab-collections/schemas/collections";
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

// Cash taken for a booking without collecting it: at the counter, or a
// collector catching up (LAB-21). The database checks the booking and amount.
export const recordCash = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = recordCashSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    const member = await findLabMember("bookings.collect");
    if (!member) return formError(cashErrorMessages.not_permitted);
    if (await isRateLimited(rateLimits.labBookingMoveUser, member.user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("record_lab_cash", {
      p_booking_id: parsed.data.bookingId,
      p_amount: parsed.data.amount,
    });
    if (error) {
      if (staleCashCodes.has(error.message)) refresh();
      return databaseErrorState(error, cashErrorMessages, "Record cash");
    }

    refresh();
    return { status: "success", message: "Cash recorded." };
  },
);
