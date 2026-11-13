"use server";

import { redirect } from "next/navigation";

import { dashboards } from "@/config/dashboards";
import { authFormError } from "@/features/auth/lib/auth-error";
import {
  consumeAuthToken,
  restoreAuthToken,
} from "@/features/auth/lib/auth-tokens";
import { resetPasswordSchema } from "@/features/auth/schemas/password";
import { getLabInviteDetails } from "@/features/lab-staff/data/lab-staff";
import { setFlash } from "@/lib/flash.server";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const EXPIRED_MESSAGE =
  "This invitation has expired or was already used. Ask your lab admin to send a new one.";

// The token from the invitation email is the permission check. It's used up
// in one UPDATE, so a double submit can't accept twice; if a later step fails
// it's put back and the same link works again.
export const acceptLabInvite = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    const { token, password } = parsed.data;
    const userId = await consumeAuthToken(token, "lab_invite");
    if (!userId) return formError(EXPIRED_MESSAGE, "token_expired");

    // Withdrawn meanwhile: leave the account as it is, without a password.
    if (!(await getLabInviteDetails(userId))) {
      return formError(EXPIRED_MESSAGE, "invite_not_found");
    }

    // Setting the password through the emailed link also proves the address.
    // Someone invited back after leaving was banned; that ends here.
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      ban_duration: "none",
    });
    if (error) {
      await restoreAuthToken(token);
      return authFormError(error);
    }

    const { error: acceptError } = await admin.rpc("accept_lab_invite", {
      p_user_id: userId,
    });
    if (acceptError) {
      // Withdrawn meanwhile: the admin's removal retires the link anyway.
      if (acceptError.message === "invite_not_found") {
        return formError(EXPIRED_MESSAGE, "invite_not_found");
      }
      await restoreAuthToken(token);
      throw new Error(`accept_lab_invite: ${acceptError.message}`);
    }

    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.user.email ?? "",
      password,
    });
    if (signInError) {
      await setFlash("success", "You're in. Log in with your new password.");
      redirect(dashboards.lab.loginHref);
    }

    // The lab area asks for an authenticator app and the lab's documents next.
    await setFlash("success", "Welcome to your lab on MedEase.");
    redirect(dashboards.lab.home);
  },
);
