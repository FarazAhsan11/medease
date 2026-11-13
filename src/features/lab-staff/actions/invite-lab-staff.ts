"use server";

import { refresh } from "next/cache";

import { authFormError } from "@/features/auth/lib/auth-error";
import { sendLabInviteEmail } from "@/features/auth/lib/auth-emails";
import { requireLabMember } from "@/features/lab-staff/lib/lab-member.server";
import { labRoleLabels } from "@/features/lab-staff/lib/lab-permissions";
import {
  EMAIL_IN_USE_MESSAGE,
  labStaffErrorMessages,
} from "@/features/lab-staff/lib/lab-staff";
import { inviteLabStaffSchema } from "@/features/lab-staff/schemas/lab-staff";
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

// Creates the person's account (unconfirmed, no password), files it under the
// lab through add_lab_staff with the admin's own session, and emails a link
// to set a password. An account the database won't take is deleted again. An
// email someone this lab removed still holds reopens their membership.
export const inviteLabStaff = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = inviteLabStaffSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    const member = await requireLabMember("staff");
    if (await isRateLimited(rateLimits.labStaffUser, member.user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const { fullName, email, role } = parsed.data;
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: false,
      app_metadata: { role: "lab", lab_role: role },
      user_metadata: { full_name: fullName },
    });
    const supabase = await createClient();
    let userId: string;
    if (error) {
      if (error.code !== "email_exists" && error.code !== "user_already_exists") {
        return authFormError(error);
      }
      // Someone this lab removed keeps their account; invite them back on it.
      const { data: restored, error: restoreError } = await supabase.rpc(
        "restore_lab_staff",
        { p_email: email, p_role: role },
      );
      if (restoreError) {
        return databaseErrorState(
          restoreError,
          labStaffErrorMessages,
          "Inviting lab staff back",
        );
      }
      if (!restored) {
        return {
          status: "error",
          message: EMAIL_IN_USE_MESSAGE,
          code: "email_exists",
          fieldErrors: { email: [EMAIL_IN_USE_MESSAGE] },
        };
      }
      userId = restored;
      // The name and header links follow this invitation.
      await admin.auth.admin.updateUserById(userId, {
        app_metadata: { role: "lab", lab_role: role },
        user_metadata: { full_name: fullName },
      });
    } else {
      userId = data.user.id;
      const { error: addError } = await supabase.rpc("add_lab_staff", {
        p_user_id: userId,
        p_role: role,
      });
      if (addError) {
        await admin.auth.admin.deleteUser(userId);
        return databaseErrorState(
          addError,
          labStaffErrorMessages,
          "Adding lab staff",
        );
      }
    }

    // Sent after the response; a failed send shows on the list as "not sent",
    // with Send again.
    await sendLabInviteEmail(
      { userId, email, name: fullName },
      member.labName,
      labRoleLabels[role],
    );

    refresh();
    return { status: "success", message: `Invitation sent to ${email}.` };
  },
);
