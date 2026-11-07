import "server-only";

import { createClient } from "@/lib/supabase/server";

import type {
  EmailCategory,
  EmailPreferences,
} from "../lib/notification-preferences";

type PreferenceRow = { category: EmailCategory; enabled: boolean };

// The signed-in user's own email settings (row level security allows only that).
export async function getEmailPreferences(
  userId: string,
): Promise<EmailPreferences> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("category, enabled")
    .eq("user_id", userId)
    .eq("channel", "email")
    .returns<PreferenceRow[]>();

  if (error) throw new Error(`notification_preferences: ${error.message}`);

  return Object.fromEntries(
    (data ?? []).map((row) => [row.category, row.enabled]),
  );
}
