"use server";

import { redirect } from "next/navigation";

import { adminRoutes } from "@/config/routes";
import {
  twoFactorCodeSchema,
  type TwoFactorSetupState,
} from "@/features/admin/schemas/two-factor";
import { getSessionUser } from "@/lib/auth/session";
import { setFlash } from "@/lib/flash.server";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

const NOT_ADMIN = "Only admins can use this page.";

// Starts pairing an authenticator app. An abandoned attempt leaves an
// unverified factor behind, so clear those first.
export const startTwoFactorSetup = withFormErrors<TwoFactorSetupState>(
  async () => {
    const user = await getSessionUser();
    if (user?.role !== "admin") return formError(NOT_ADMIN, "not_admin");

    const supabase = await createClient();
    const { data: factors, error: listError } =
      await supabase.auth.mfa.listFactors();
    if (listError) throw new Error(`mfa: ${listError.message}`);

    await Promise.all(
      factors.all
        .filter((factor) => factor.status === "unverified")
        .map((factor) => supabase.auth.mfa.unenroll({ factorId: factor.id })),
    );

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
    });
    if (error) throw new Error(`mfa: ${error.message}`);

    return {
      status: "success",
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    };
  },
);

// Both first-time pairing and every later sign-in end here. Success upgrades
// the session to aal2, which the admin pages and database functions require.
export const verifyTwoFactor = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = twoFactorCodeSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    const user = await getSessionUser();
    if (user?.role !== "admin") return formError(NOT_ADMIN, "not_admin");

    const supabase = await createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify(parsed.data);
    if (error) {
      return formError(
        "That code didn't work. Check the time on your phone and try again.",
        "invalid_code",
      );
    }

    await setFlash("success", "Two-factor check passed.");
    redirect(adminRoutes.home);
  },
);
