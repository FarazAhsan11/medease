import "server-only";

import { dateChipParts, formatTime, toDateKey } from "@/lib/datetime";
import type { DateOption, TimeSlot } from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";

export const BOOKING_WINDOW_DAYS = 14;

export type BookingDay = DateOption & { slots: TimeSlot[]; openCount: number };

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

  const days = new Map<string, BookingDay>();
  for (const slot of (data ?? []) as SlotRow[]) {
    const key = toDateKey(slot.starts_at, timeZone);
    let day = days.get(key);
    if (!day) {
      day = {
        value: key,
        ...dateChipParts(key, timeZone),
        slots: [],
        openCount: 0,
      };
      days.set(key, day);
    }
    day.slots.push({
      value: new Date(slot.starts_at).toISOString(),
      label: formatTime(slot.starts_at, timeZone),
      disabled: slot.is_booked,
      note: slot.is_booked ? "Booked" : undefined,
    });
    if (!slot.is_booked) day.openCount += 1;
  }

  return [...days.values()].map((day) =>
    day.openCount === 0 ? { ...day, note: "Full" } : day,
  );
}
