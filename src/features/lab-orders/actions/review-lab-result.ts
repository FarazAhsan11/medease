"use server";

import { refresh } from "next/cache";

import { labResultErrorMessages } from "@/features/lab-orders/lib/lab-orders";
import { labResultReviewSchema } from "@/features/lab-orders/schemas/lab-result-review";
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

// The database checks the caller ordered the tests and the report is out,
// then tells the patient about a new or changed comment (LAB-08).
export const reviewLabResult = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = labResultReviewSchema.safeParse(
      Object.fromEntries(formData),
    );
    if (!parsed.success) return validationError(parsed.error);

    const user = await requireRole("doctor");
    if (await isRateLimited(rateLimits.labResultUser, user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const { bookingId, comment } = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.rpc("review_lab_result", {
      p_booking_id: bookingId,
      p_comment: comment,
    });
    if (error) {
      return databaseErrorState(
        error,
        labResultErrorMessages,
        "Reviewing a lab result",
      );
    }

    refresh();
    return {
      status: "success",
      message: comment
        ? "Comment saved. The patient sees it with the report."
        : formData.get("hadComment")
          ? "Comment removed. The report stays marked as reviewed."
          : "Marked as reviewed.",
    };
  },
);
