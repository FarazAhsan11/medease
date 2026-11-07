"use server";

import {
  messageErrors,
  type Message,
} from "@/features/messaging/lib/messaging";
import {
  sendMessageSchema,
  type SendMessageInput,
} from "@/features/messaging/schemas/messaging";
import { getSessionUser } from "@/lib/auth/session";
import { databaseErrorState } from "@/lib/database-errors";
import { formError, type FormState } from "@/lib/form-state";
import {
  RATE_LIMITED_MESSAGE,
  isRateLimited,
  rateLimits,
} from "@/lib/rate-limit.server";
import { createClient } from "@/lib/supabase/server";
import { getUnexpectedErrorMessage } from "@/lib/errors";

export type SendMessageState = FormState & { sent?: Message };

// The database checks the caller is in the conversation, that they still have
// a booking together and, for a patient, that the messaging window is open.
// The other person gets the message live through Realtime.
export async function sendMessage(
  input: SendMessageInput,
): Promise<SendMessageState> {
  try {
    const parsed = sendMessageSchema.safeParse(input);
    if (!parsed.success) {
      return formError(
        parsed.error.issues[0]?.message ?? messageErrors.invalid_message,
        "invalid_message",
      );
    }

    const user = await getSessionUser();
    if (user?.role !== "patient" && user?.role !== "doctor") {
      return formError(messageErrors.not_allowed, "not_allowed");
    }

    if (await isRateLimited(rateLimits.messageUser, user.id)) {
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    const { conversationId, body } = parsed.data;
    const supabase = await createClient();
    const { data, error } = await supabase
      .rpc("send_message", {
        p_conversation_id: conversationId,
        p_body: body,
      })
      .single<{ id: string; created_at: string }>();

    if (error)
      return databaseErrorState(error, messageErrors, "Sending a message");

    return {
      status: "success",
      sent: {
        id: data.id,
        senderId: user.id,
        body,
        createdAt: data.created_at,
        readAt: null,
      },
    };
  } catch (error) {
    // Log the message only; never what was written.
    console.error(
      "Sending a message failed:",
      error instanceof Error ? error.message : error,
    );
    return formError(getUnexpectedErrorMessage(error), "unexpected_error");
  }
}
