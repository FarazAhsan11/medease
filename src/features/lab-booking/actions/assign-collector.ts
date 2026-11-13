"use server";

import { refresh } from "next/cache";

import { assignCollectorErrorMessages } from "@/features/lab-booking/lib/lab-bookings";
import { assignCollectorSchema } from "@/features/lab-booking/schemas/lab-booking";
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

// The admin or front desk sends a collector on a home visit (LAB-06). The
// database checks the visit and the person, and tells the collector.
export const assignCollector = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = assignCollectorSchema.safeParse(
      Object.fromEntries(formData),
    );
    if (!parsed.success) return validationError(parsed.error);

    const member = await findLabMember("bookings.assign");
    if (!member) {
      return formError(assignCollectorErrorMessages.not_permitted, "forbidden");
    }
    // Part of moving bookings along, so it shares their limit.
    if (await isRateLimited(rateLimits.labBookingMoveUser, member.user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const { bookingId, collectorId } = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.rpc("assign_lab_collector", {
      p_booking_id: bookingId,
      p_collector_id: collectorId,
    });
    if (error) {
      // The visit or the person changed meanwhile: show the list as it is.
      refresh();
      return databaseErrorState(
        error,
        assignCollectorErrorMessages,
        "Assigning a collector",
      );
    }

    refresh();
    return {
      status: "success",
      message: collectorId ? "Collector assigned." : "Collector taken off.",
    };
  },
);
