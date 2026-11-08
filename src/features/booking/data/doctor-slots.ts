import "server-only";

import { groupSlotsByDay, type BookingDay } from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";

export const BOOKING_WINDOW_DAYS = 14;

type SlotRow = { starts_at: string; ends_at: string; is_booked: boolean };

// One round trip for the whole booking window, grouped by the doctor's local
// calendar day. Booked slots stay in the list so patients see them as taken.
export async function getBookingDays(
  doctorId: string,
  timeZone: string,
): Promise<BookingDay[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_doctor_slots", {
    p_doctor_id: doctorId,
    p_days: BOOKING_WINDOW_DAYS,
  });

  if (error) throw new Error(`get_doctor_slots: ${error.message}`);

  return groupSlotsByDay(
    ((data ?? []) as SlotRow[]).map((slot) => ({
      startsAt: slot.starts_at,
      taken: slot.is_booked,
      note: slot.is_booked ? "Booked" : undefined,
    })),
    timeZone,
  );
}
