"use server";

import { redirect } from "next/navigation";

import { dashboards } from "@/config/dashboards";
import { twoFactorRoute } from "@/config/routes";
import {
  createRecoveryCodes,
  hashRecoveryCode,
} from "@/features/two-factor/lib/recovery-codes";
import {
  recoveryCodeSchema,
  twoFactorCodeSchema,
  type RecoveryCodesState,
  type TwoFactorSetupState,
} from "@/features/two-factor/schemas/two-factor";
import { getPostLoginPath } from "@/lib/auth/redirects";
import { getSessionUser, isSecondFactorRequired } from "@/lib/auth/session";
import { setFlash } from "@/lib/flash.server";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import {
  isRateLimited,
  RATE_LIMITED_MESSAGE,
  rateLimits,
} from "@/lib/rate-limit.server";
import { recordSecurityEvent } from "@/lib/security-events.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const SESSION_EXPIRED = "Your session has expired. Please log in again.";

// Starts pairing an authenticator app. An abandoned attempt leaves an
// unverified factor behind, so clear those first.
export const startTwoFactorSetup = withFormErrors<TwoFactorSetupState>(
  async () => {
    const user = await getSessionUser();
    if (!user) return formError(SESSION_EXPIRED, "session_expired");

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

// First-time pairing and every later sign-in both end here. Success upgrades the
// session to aal2, which clinical data requires. Pairing also hands back the
// recovery codes, which is the one time they can be seen.
export const verifyTwoFactor = withFormErrors<RecoveryCodesState, FormData>(
  async (_previousState, formData) => {
    const parsed = twoFactorCodeSchema.safeParse({
      factorId: formData.get("factorId"),
      code: formData.get("code"),
    });
    if (!parsed.success) return validationError(parsed.error);

    const user = await getSessionUser();
    if (!user) return formError(SESSION_EXPIRED, "session_expired");

    if (await isRateLimited(rateLimits.twoFactorCode, user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const supabase = await createClient();
    const { data: factors, error: listError } =
      await supabase.auth.mfa.listFactors();
    if (listError) throw new Error(`mfa: ${listError.message}`);

    const pairing = factors.all.some(
      (factor) =>
        factor.id === parsed.data.factorId && factor.status === "unverified",
    );

    const { error } = await supabase.auth.mfa.challengeAndVerify(parsed.data);
    if (error) {
      return formError(
        "That code didn't work. Check the time on your phone and try again.",
        "invalid_code",
      );
    }

    if (pairing) {
      await recordSecurityEvent(user.id, "mfa.enrolled");
      return {
        status: "success",
        message: "Two-factor is on.",
        recoveryCodes: await createRecoveryCodes(user.id),
      };
    }

    const next = formData.get("next");
    await setFlash("success", "Two-factor check passed.");
    redirect(
      getPostLoginPath(user.role, typeof next === "string" ? next : null),
    );
  },
);

// A new set replaces the old one. Needs a passed check, so a stolen password
// can't mint codes.
export const regenerateRecoveryCodes = withFormErrors<
  RecoveryCodesState,
  FormData
>(async () => {
  const user = await getSessionUser();
  if (user?.assuranceLevel !== "aal2") {
    return formError(
      "Please pass your two-factor check first.",
      "aal2_required",
    );
  }

  return {
    status: "success",
    message: "New recovery codes created. The old ones no longer work.",
    recoveryCodes: await createRecoveryCodes(user.id),
  };
});

// For a lost phone. The password has already been proven by the session; the code
// removes the lost factor, so the only way on is to pair a new app. Supabase ends
// the person's sessions when a verified factor goes, hence the new sign-in.
export const redeemRecoveryCode = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = recoveryCodeSchema.safeParse({
      code: formData.get("code"),
    });
    if (!parsed.success) return validationError(parsed.error);

    const user = await getSessionUser();
    if (!user) return formError(SESSION_EXPIRED, "session_expired");

    if (await isRateLimited(rateLimits.recoveryCode, user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const admin = createAdminClient();
    const { data: accepted, error } = await admin.rpc("use_recovery_code", {
      p_user_id: user.id,
      p_code_hash: hashRecoveryCode(user.id, parsed.data.code),
    });
    if (error) throw new Error(`recovery code: ${error.message}`);

    if (!accepted) {
      const message = "That recovery code isn't valid or was already used.";
      return {
        status: "error",
        code: "invalid_recovery_code",
        message,
        fieldErrors: { code: [message] },
      };
    }

    const { data: factors, error: listError } =
      await admin.auth.admin.mfa.listFactors({ userId: user.id });
    if (listError) throw new Error(`mfa: ${listError.message}`);

    for (const factor of factors?.factors ?? []) {
      const { error: deleteError } = await admin.auth.admin.mfa.deleteFactor({
        userId: user.id,
        id: factor.id,
      });
      if (deleteError) throw new Error(`mfa: ${deleteError.message}`);
    }

    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });

    await setFlash(
      "success",
      "Recovery code accepted. Log in, then set up your authenticator app again.",
    );
    redirect(dashboards[user.role].loginHref);
  },
);

// Patients only: doctors, labs and admins can't turn it off.
export const disableTwoFactor = withFormErrors<FormState, FormData>(
  async () => {
    const user = await getSessionUser();
    if (!user) return formError(SESSION_EXPIRED, "session_expired");
    if (isSecondFactorRequired(user.role)) {
      return formError(
        "Your account has to keep two-factor on.",
        "two_factor_required",
      );
    }
    if (user.assuranceLevel !== "aal2") {
      return formError(
        "Please pass your two-factor check first.",
        "aal2_required",
      );
    }

    const supabase = await createClient();
    const { data: factors, error: listError } =
      await supabase.auth.mfa.listFactors();
    if (listError) throw new Error(`mfa: ${listError.message}`);

    for (const factor of factors.all) {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: factor.id,
      });
      if (error) throw new Error(`mfa: ${error.message}`);
    }

    const { error: codesError } = await createAdminClient()
      .from("mfa_recovery_codes")
      .delete()
      .eq("user_id", user.id);
    if (codesError) throw new Error(`recovery codes: ${codesError.message}`);

    await recordSecurityEvent(user.id, "mfa.disabled");
    await supabase.auth.refreshSession();

    await setFlash("success", "Two-factor is off.");
    redirect(twoFactorRoute);
  },
);
