"use server";

import { redirect } from "next/navigation";

import { patientRoutes } from "@/config/routes";
import { labBookingChangeErrorMessages } from "@/features/lab-booking/lib/lab-bookings";
import { rescheduleLabBookingSchema } from "@/features/lab-booking/schemas/lab-booking";
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

// The patient moves a lab booking to a new day or window (LAB-20). The
// database checks the booking, the window's capacity under the booking lock,
// and the limit on moves, and tells the lab.
export const rescheduleLabBooking = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = rescheduleLabBookingSchema.safeParse(
      Object.fromEntries(formData),
    );
    if (!parsed.success) return validationError(parsed.error);

    const user = await requireRole("patient");
    if (await isRateLimited(rateLimits.labBookingChangeUser, user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const change = parsed.data;
    const home = change.collection === "home";
    const supabase = await createClient();
    const { error } = await supabase.rpc("reschedule_lab_booking", {
      p_booking_id: change.bookingId,
      p_visit_date: home ? null : change.visitDate,
      p_slot_starts_at: home ? change.slotStartsAt : null,
    });
    if (error) {
      return databaseErrorState(
        error,
        labBookingChangeErrorMessages,
        "Lab booking reschedule",
      );
    }

    // Generic on purpose: the flash cookie is readable in the browser.
    await setFlash("success", "Your lab booking has a new time.");
    redirect(patientRoutes.labTests);
  },
);
