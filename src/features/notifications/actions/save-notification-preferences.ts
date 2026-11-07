"use server";

import { refresh } from "next/cache";

import { getSessionUser, requireRole } from "@/lib/auth/session";
import { databaseErrorState } from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { validationError, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

import { emailPreferencesSchema } from "../schemas/notification-preferences";

const messages = {
  no_notification_settings: "Your account has no email settings to change.",
  invalid_category: "Those settings don't apply to your account.",
};

// Patients and doctors share this form. The database decides which categories
// each role has and refuses the rest.
export const saveEmailPreferences = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    // Runs the caller's own role checks, two-factor included; signed out goes
    // to the login page.
    const user = await getSessionUser();
    await requireRole(user?.role ?? "patient");

    const parsed = emailPreferencesSchema.safeParse(
      Object.fromEntries(formData),
    );
    if (!parsed.success) return validationError(parsed.error);

    const supabase = await createClient();
    const { error } = await supabase.rpc("save_notification_preferences", {
      p_channel: "email",
      p_enabled: parsed.data,
    });
    if (error) {
      return databaseErrorState(error, messages, "Saving email settings");
    }

    refresh();
    return { status: "success", message: "Email settings saved." };
  },
);
