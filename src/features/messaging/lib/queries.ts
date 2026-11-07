import type { SupabaseClient } from "@supabase/supabase-js";

import {
  MESSAGES_SHOWN,
  toConversation,
  type Conversation,
  type ConversationRow,
  type MessageRow,
  type MessagingRole,
} from "@/features/messaging/lib/messaging";

// The reads both the server pages and the live components make, written once.
// Each returns null on an error, for the caller to decide what to show.

// How many conversations a list loads. The database caps it at 100.
export const CONVERSATIONS_SHOWN = 50;

const MESSAGE_COLUMNS =
  "id, conversation_id, sender_id, recipient_id, body, created_at, read_at";

// The caller's newest conversations, or the one asked for. The database
// function works out who the caller is, so it only ever returns their own.
export async function queryConversations(
  supabase: SupabaseClient,
  role: MessagingRole,
  options: { conversationId?: string; limit?: number } = {},
): Promise<Conversation[] | null> {
  const { data, error } = await supabase.rpc("get_conversations", {
    p_conversation_id: options.conversationId ?? null,
    p_limit: options.limit ?? CONVERSATIONS_SHOWN,
  });
  if (error) return null;
  return ((data ?? []) as ConversationRow[]).map((row) =>
    toConversation(row, role),
  );
}

// The latest messages, newest first, or those after `after`. Indexed on
// (conversation_id, created_at).
export async function queryMessages(
  supabase: SupabaseClient,
  conversationId: string,
  after?: string,
): Promise<MessageRow[] | null> {
  let query = supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("conversation_id", conversationId);
  if (after) query = query.gt("created_at", after);
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(MESSAGES_SHOWN)
    .returns<MessageRow[]>();
  return error ? null : (data ?? []);
}

// Indexed on (recipient_id) where read_at is null.
export async function queryUnreadCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number | null> {
  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null);
  return error ? null : (count ?? 0);
}
