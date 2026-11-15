"use server";

import { refresh } from "next/cache";

import { requireLabMember } from "@/features/lab-staff/lib/lab-member.server";
import { labStaffErrorMessages } from "@/features/lab-staff/lib/lab-staff";
import { labSignerSchema } from "@/features/lab-staff/schemas/lab-staff";
import { databaseErrorState } from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import {
  isRateLimited,
  RATE_LIMITED_MESSAGE,
  rateLimits,
} from "@/lib/rate-limit.server";
import { createClient } from "@/lib/supabase/server";

// The admin sets the name and qualification a signer's reports carry (LAB-17),
// or clears them, which stops that person signing until they're set again.
export const saveLabSigner = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = labSignerSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    const member = await requireLabMember("staff");
    if (await isRateLimited(rateLimits.labStaffUser, member.user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const { userId, signerName, signerTitle, clear } = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.rpc("save_lab_signer", {
      p_user_id: userId,
      p_name: clear ? null : signerName,
      p_title: clear ? null : signerTitle,
    });
    if (error) {
      if (error.message === "member_not_found") refresh();
      return databaseErrorState(
        error,
        labStaffErrorMessages,
        "Saving sign-off details",
      );
    }

    refresh();
    return {
      status: "success",
      message: clear
        ? "Sign-off details removed. They can't sign off reports now."
        : "Sign-off details saved.",
    };
  },
);
