"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// Marks one notification read, or all of the caller's with no id. The function
// only ever touches the caller's own. A failure just leaves the dot on, so it's
// logged and not shown.
export async function markNotificationsRead(id?: string) {
  const parsed = z.uuid().optional().safeParse(id);
  if (!parsed.success) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_notifications_read", {
    p_id: parsed.data ?? null,
  });

  if (error) console.error("Marking notifications read failed:", error.code);
}
