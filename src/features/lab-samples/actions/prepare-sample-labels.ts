"use server";

import { redirect } from "next/navigation";

import { labRoutes } from "@/config/routes";
import { sampleLabelErrorMessages } from "@/features/lab-samples/lib/samples";
import { sampleLabelsSchema } from "@/features/lab-samples/schemas/sample-labels";
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

// Gives a booking its sample codes, if it has none yet, and opens the labels
// to print (LAB-16). A POST, so a prefetched link can never make a code; the
// labels page itself only reads.
export const prepareSampleLabels = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = sampleLabelsSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    const member = await findLabMember("bookings.collect");
    if (!member) return formError(sampleLabelErrorMessages.not_permitted);
    if (await isRateLimited(rateLimits.labSampleLabelUser, member.user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("prepare_lab_sample_labels", {
      p_booking_id: parsed.data.bookingId,
    });
    if (error) {
      return databaseErrorState(
        error,
        sampleLabelErrorMessages,
        "Sample labels",
      );
    }

    redirect(labRoutes.bookingLabels(parsed.data.bookingId));
  },
);
