import "server-only";

import { createClient } from "@/lib/supabase/server";

export type TimeOff = {
  id: string;
  startsOn: string;
  endsOn: string;
};

type TimeOffRow = { id: string; starts_on: string; ends_on: string };

// Current and upcoming days off, for the signed-in doctor only (row level
// security). `today` is a date in the doctor's timezone.
export async function listTimeOff(
  doctorId: string,
  today: string,
): Promise<TimeOff[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("doctor_time_off")
    .select("id, starts_on, ends_on")
    .eq("doctor_id", doctorId)
    .gte("ends_on", today)
    .order("starts_on")
    .returns<TimeOffRow[]>();

  if (error) throw new Error(`doctor_time_off: ${error.message}`);

  return data.map((row) => ({
    id: row.id,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
  }));
}
