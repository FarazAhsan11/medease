"use server";

import { z } from "zod";

import { databaseErrorState } from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, type FormState } from "@/lib/form-state";
import {
  isIpRateLimited,
  RATE_LIMITED_MESSAGE,
  rateLimits,
} from "@/lib/rate-limit.server";
import { createAdminClient } from "@/lib/supabase/admin";

const INVALID_LINK =
  "This link isn't valid. You can turn reminders off in your settings.";

// No session here: the token from the email is the permission check, and the
// function does nothing but turn that one patient's reminders off.
export const unsubscribeFromMedicineReminders = withFormErrors(
  async (_previousState: FormState, formData: FormData): Promise<FormState> => {
    const token = z.uuid().safeParse(formData.get("token"));
    if (!token.success) return formError(INVALID_LINK, "invalid_link");

    if (await isIpRateLimited(rateLimits.unsubscribeIp)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const { data, error } = await createAdminClient().rpc(
      "unsubscribe_medicine_reminders",
      { p_token: token.data },
    );
    if (error) return databaseErrorState(error, {}, "Unsubscribing");
    if (!data) return formError(INVALID_LINK, "invalid_link");

    return { status: "success" };
  },
);
