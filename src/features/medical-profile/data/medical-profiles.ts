import "server-only";

import {
  MEDICAL_PROFILE_COLUMNS,
  toMedicalProfile,
  type MedicalProfile,
  type MedicalProfileRow,
} from "@/features/medical-profile/lib/medical-profile";
import { CLINIC_TIMEZONE, toDateKey } from "@/lib/datetime";
import { createClient } from "@/lib/supabase/server";

// Medical profiles by care recipient id, read through row level security: a
// doctor gets only people with a booking with them that wasn't cancelled, so
// anyone else is simply missing from the result.
export async function getMedicalProfiles(
  careRecipientIds: string[],
): Promise<Record<string, MedicalProfile>> {
  const ids = [...new Set(careRecipientIds)];
  if (ids.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("care_recipients")
    .select(MEDICAL_PROFILE_COLUMNS)
    .in("id", ids)
    .returns<MedicalProfileRow[]>();

  if (error) throw new Error(`care_recipients: ${error.message}`);

  const today = toDateKey(new Date(), CLINIC_TIMEZONE);
  return Object.fromEntries(
    data.map((row) => [row.id, toMedicalProfile(row, today)]),
  );
}

export async function getMedicalProfile(careRecipientId: string) {
  const profiles = await getMedicalProfiles([careRecipientId]);
  return profiles[careRecipientId] ?? null;
}
