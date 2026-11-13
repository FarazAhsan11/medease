"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { requireLabMember } from "@/features/lab-staff/lib/lab-member.server";
import { labStaffErrorMessages } from "@/features/lab-staff/lib/lab-staff";
import { labStaffMemberSchema } from "@/features/lab-staff/schemas/lab-staff";
import { databaseErrorState } from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, type FormState } from "@/lib/form-state";
import {
  isRateLimited,
  RATE_LIMITED_MESSAGE,
  rateLimits,
} from "@/lib/rate-limit.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// About a hundred years: Supabase has no permanent ban.
const BAN_DURATION = "876000h";

// remove_lab_staff ends access in the database straight away. Then the account
// itself: an unused invitation's is deleted; anyone who signed in is banned, so
// their session can't be refreshed, and their account stays for the lab's
// records.
export const removeLabStaff = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = labStaffMemberSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return formError(labStaffErrorMessages.member_not_found, "not_found");
    }

    const member = await requireLabMember("staff");
    if (await isRateLimited(rateLimits.labStaffUser, member.user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const { userId } = parsed.data;
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("remove_lab_staff", {
      p_user_id: userId,
    });
    if (error) {
      if (error.message === "member_not_found") refresh();
      return databaseErrorState(
        error,
        labStaffErrorMessages,
        "Removing lab staff",
      );
    }

    const wasInvited = z.string().parse(data) === "invited";
    const admin = createAdminClient();
    const { error: accountError } = wasInvited
      ? await admin.auth.admin.deleteUser(userId)
      : await admin.auth.admin.updateUserById(userId, {
          ban_duration: BAN_DURATION,
        });
    if (accountError) {
      // Access has already ended; the session lapses within the hour.
      console.error("Lab staff account after removal:", accountError.message);
    }

    refresh();
    return {
      status: "success",
      message: wasInvited ? "Invitation withdrawn." : "Removed from your lab.",
    };
  },
);
