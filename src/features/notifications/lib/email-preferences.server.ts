import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import type { EmailCategory } from "./notification-preferences";

// Whether the other person in an action (the doctor a patient booked, the patient
// a doctor wrote a prescription for) wants this email. Asked after the action has
// succeeded, so the database has already checked the caller. If the answer can't
// be read the email is skipped: these are optional, the bell always has the
// update, and an email someone turned off shouldn't arrive.
export async function wantsEmail(userId: string, category: EmailCategory) {
  const { data, error } = await createAdminClient().rpc("email_wanted", {
    p_user_id: userId,
    p_category: category,
  });

  if (error) {
    console.error("Reading email settings failed:", error.code);
    return false;
  }

  return data === true;
}
