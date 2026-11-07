"use server";

import { redirect } from "next/navigation";

import {
  messageErrors,
  messagesRoutes,
} from "@/features/messaging/lib/messaging";
import { openConversationSchema } from "@/features/messaging/schemas/messaging";
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

// Finds or starts the conversation with a doctor (for a patient) or a patient
// (for a doctor) and opens it. The database checks they have a booking together.
export const openConversation = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = openConversationSchema.safeParse(
      Object.fromEntries(formData),
    );
    if (!parsed.success) {
      return formError(messageErrors.not_participant, "invalid_input");
    }

    const user = await getSessionUser();
    if (user?.role !== "patient" && user?.role !== "doctor") {
      return formError(messageErrors.not_allowed, "not_allowed");
    }

    if (await isRateLimited(rateLimits.conversationUser, user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("open_conversation", {
      p_other_id: parsed.data.otherId,
    });
    if (error) {
      return databaseErrorState(error, messageErrors, "Opening a conversation");
    }

    redirect(messagesRoutes[user.role].conversation(data as string));
  },
);
