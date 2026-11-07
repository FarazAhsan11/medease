"use server";

import { z } from "zod";

import { getSessionUser } from "@/lib/auth/session";
import { isRateLimited, rateLimits } from "@/lib/rate-limit.server";
import { createClient } from "@/lib/supabase/server";

// Marks the other person's messages to the caller as read; the function never
// touches anyone else's. A failure only leaves them unread, so it isn't shown.
export async function markConversationRead(conversationId: string) {
  const parsed = z.uuid().safeParse(conversationId);
  if (!parsed.success) return;

  const user = await getSessionUser();
  if (!user) return;
  if (await isRateLimited(rateLimits.messageReadUser, user.id)) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_conversation_read", {
    p_conversation_id: parsed.data,
  });

  if (error) console.error("Marking messages read failed:", error.code);
}
