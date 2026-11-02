import "server-only";

import { createClient } from "@/lib/supabase/server";

import {
  defaultMedicineReminders,
  type MedicineReminderSettings,
} from "../lib/medicine-reminders";

type SettingsRow = {
  enabled: boolean;
  morning_time: string;
  afternoon_time: string;
  night_time: string;
  timezone: string;
};

// Postgres answers "08:00:00"; a time input wants "08:00".
const toClock = (time: string) => time.slice(0, 5);

// The signed-in patient's own settings (row level security allows only that).
export async function getMedicineReminders(
  userId: string,
): Promise<MedicineReminderSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("medicine_reminder_settings")
    .select("enabled, morning_time, afternoon_time, night_time, timezone")
    .eq("patient_id", userId)
    .maybeSingle<SettingsRow>();

  if (error) throw new Error(`medicine_reminder_settings: ${error.message}`);
  if (!data) return defaultMedicineReminders;

  return {
    enabled: data.enabled,
    morning: toClock(data.morning_time),
    afternoon: toClock(data.afternoon_time),
    night: toClock(data.night_time),
    timezone: data.timezone,
  };
}
