"use server";

import { refresh } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { databaseErrorState } from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { validationError, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

import { medicineRemindersSchema } from "../schemas/medicine-reminders";

const messages = {
  not_patient: "Only patients can set medicine reminders.",
  invalid_reminder_times:
    "Choose times in order: morning, then afternoon, then night.",
  invalid_timezone: "Choose a time zone from the list.",
};

export const saveMedicineReminders = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    await requireRole("patient");

    const parsed = medicineRemindersSchema.safeParse(
      Object.fromEntries(formData),
    );
    if (!parsed.success) return validationError(parsed.error);

    const { enabled, morning, afternoon, night, timezone } = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.rpc("save_medicine_reminders", {
      p_enabled: enabled,
      p_morning: morning,
      p_afternoon: afternoon,
      p_night: night,
      p_timezone: timezone,
    });
    if (error) {
      return databaseErrorState(error, messages, "Saving medicine reminders");
    }

    refresh();
    return {
      status: "success",
      message: enabled
        ? "Medicine reminders are on."
        : "Medicine reminders are off.",
    };
  },
);
