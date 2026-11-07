import "server-only";

import {
  toMessage,
  type Conversation,
  type Message,
  type MessagingRole,
} from "@/features/messaging/lib/messaging";
import {
  CONVERSATIONS_SHOWN,
  queryConversations,
  queryMessages,
  queryUnreadCount,
} from "@/features/messaging/lib/queries";
import { createClient } from "@/lib/supabase/server";

// The caller's newest conversations.
export async function listConversations(
  role: MessagingRole,
  limit = CONVERSATIONS_SHOWN,
): Promise<Conversation[]> {
  const conversations = await queryConversations(await createClient(), role, {
    limit,
  });
  if (!conversations) console.error("Loading conversations failed");
  return conversations ?? [];
}

export async function getConversation(
  role: MessagingRole,
  conversationId: string,
): Promise<Conversation | null> {
  const conversations = await queryConversations(await createClient(), role, {
    conversationId,
  });
  if (!conversations) console.error("Loading a conversation failed");
  return conversations?.[0] ?? null;
}

// The latest messages, oldest first.
export async function getMessages(conversationId: string): Promise<Message[]> {
  const rows = await queryMessages(await createClient(), conversationId);
  if (!rows) console.error("Loading messages failed");
  return (rows ?? []).map(toMessage).reverse();
}

// For the header, on every page, so a failure shows no badge rather than an error.
export async function getUnreadMessageCount(userId: string) {
  const count = await queryUnreadCount(await createClient(), userId);
  if (count === null) console.error("Counting unread messages failed");
  return count ?? 0;
}
