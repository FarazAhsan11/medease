"use server";

import { sendConfirmationEmail } from "@/features/auth/lib/auth-emails";
import { findAuthUserByEmail } from "@/features/auth/lib/auth-users";
import { emailSchema } from "@/features/auth/schemas/sign-in";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, type FormState } from "@/lib/form-state";
import {
  isIpRateLimited,
  RATE_LIMITED_MESSAGE,
  rateLimits,
} from "@/lib/rate-limit.server";

export const resendConfirmation = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = emailSchema.safeParse(formData.get("email"));
    if (!parsed.success) return formError("Enter a valid email address.");

    if (await isIpRateLimited(rateLimits.resendConfirmationIp)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const user = await findAuthUserByEmail(parsed.data);
    if (user && !user.email_confirmed_at) {
      const status = await sendConfirmationEmail({
        userId: user.id,
        email: user.email,
        name: user.full_name,
      });

      if (status === "cooldown") {
        return formError(
          "Please wait a minute before asking for another email.",
          "cooldown",
        );
      }
      if (status === "rate_limited") {
        return formError(
          "You've asked for several emails already. Please try again in an hour.",
          "rate_limited",
        );
      }
    }

    return { status: "success", message: "We've sent you a new link." };
  },
);
