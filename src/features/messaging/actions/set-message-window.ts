"use server";

import { refresh } from "next/cache";

import { messageErrors } from "@/features/messaging/lib/messaging";
import { messageWindowSchema } from "@/features/messaging/schemas/messaging";
import { getSessionUser } from "@/lib/auth/session";
import { databaseErrorState } from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, type FormState } from "@/lib/form-state";
import {
  RATE_LIMITED_MESSAGE,
  isRateLimited,
  rateLimits,
} from "@/lib/rate-limit.server";
import { createClient } from "@/lib/supabase/server";

// MSG-04: the doctor gives the patient 7 more days to write, or closes it now.
export const setMessageWindow = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = messageWindowSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return formError(messageErrors.invalid_action, "invalid_action");
    }

    const user = await getSessionUser();
    if (user?.role !== "doctor") {
      return formError(messageErrors.not_doctor, "not_doctor");
    }

    if (await isRateLimited(rateLimits.conversationUser, user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const { conversationId, action } = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.rpc("set_message_window", {
      p_conversation_id: conversationId,
      p_action: action,
    });
    if (error) {
      return databaseErrorState(error, messageErrors, "Changing messaging");
    }

    refresh();
    return {
      status: "success",
      message:
        action === "extend"
          ? "The patient can write for 7 more days."
          : "The patient can no longer write until their next booking.",
    };
  },
);
