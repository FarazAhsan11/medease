import "server-only";

import {
  NOTIFICATIONS_SHOWN,
  toNotification,
  type NotificationFeed,
  type NotificationRow,
} from "@/features/notifications/lib/notifications";
import { createClient } from "@/lib/supabase/server";

const EMPTY: NotificationFeed = { items: [], unread: 0 };

// The header is on every page, so a failure here shows an empty bell instead of
// taking the whole app down.
export async function getNotifications(
  userId: string,
): Promise<NotificationFeed> {
  const supabase = await createClient();
  const [recent, unread] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, kind, href, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(NOTIFICATIONS_SHOWN)
      .returns<NotificationRow[]>(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
  ]);

  const error = recent.error ?? unread.error;
  if (error) {
    console.error("Loading notifications failed:", error.code);
    return EMPTY;
  }

  return {
    items: (recent.data ?? []).map(toNotification),
    unread: unread.count ?? 0,
  };
}
