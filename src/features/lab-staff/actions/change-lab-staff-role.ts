"use server";

import { refresh } from "next/cache";

import { requireLabMember } from "@/features/lab-staff/lib/lab-member.server";
import { labRoleLabels } from "@/features/lab-staff/lib/lab-permissions";
import { labStaffErrorMessages } from "@/features/lab-staff/lib/lab-staff";
import { changeLabStaffRoleSchema } from "@/features/lab-staff/schemas/lab-staff";
import { databaseErrorState } from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import {
  isRateLimited,
  RATE_LIMITED_MESSAGE,
  rateLimits,
} from "@/lib/rate-limit.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// The database applies the new role at once. The copy in app_metadata, which
// only picks header links, follows here and reaches their session when it
// next refreshes.
export const changeLabStaffRole = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = changeLabStaffRoleSchema.safeParse(
      Object.fromEntries(formData),
    );
    if (!parsed.success) return validationError(parsed.error);

    const member = await requireLabMember("staff");
    if (await isRateLimited(rateLimits.labStaffUser, member.user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const { userId, role } = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.rpc("set_lab_staff_role", {
      p_user_id: userId,
      p_role: role,
    });
    if (error) {
      if (error.message === "member_not_found") refresh();
      return databaseErrorState(
        error,
        labStaffErrorMessages,
        "Changing a staff role",
      );
    }

    const { error: metadataError } =
      await createAdminClient().auth.admin.updateUserById(userId, {
        app_metadata: { role: "lab", lab_role: role },
      });
    if (metadataError) {
      // Only their links lag; what they can do already changed.
      console.error("Lab staff role metadata:", metadataError.message);
    }

    refresh();
    return {
      status: "success",
      message: `Role changed to ${labRoleLabels[role].toLowerCase()}.`,
    };
  },
);
