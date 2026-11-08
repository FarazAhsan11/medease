import { dateChipParts, formatTime, toDateKey } from "@/lib/datetime";

export type DateOption = {
  value: string;
  weekday: string;
  day: string;
  month: string;
  // Short status under the date, e.g. "Full".
  note?: string;
};

export type TimeSlot = {
  value: string;
  label: string;
  disabled?: boolean;
  // Short status under the time, e.g. "Booked".
  note?: string;
};

export type BookingDay = DateOption & { slots: TimeSlot[]; openCount: number };

export type SlotInput = {
  startsAt: string;
  // Booked or full; the slot stays in the list, shown as taken.
  taken: boolean;
  note?: string;
};

// Slots grouped by the provider's local calendar day, in order. A day with no
// open slot is marked "Full".
export function groupSlotsByDay(
  slots: SlotInput[],
  timeZone: string,
): BookingDay[] {
  const days = new Map<string, BookingDay>();
  for (const slot of slots) {
    const key = toDateKey(slot.startsAt, timeZone);
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
      value: new Date(slot.startsAt).toISOString(),
      label: formatTime(slot.startsAt, timeZone),
      disabled: slot.taken,
      note: slot.note,
    });
    if (!slot.taken) day.openCount += 1;
  }
  return [...days.values()].map((day) =>
    day.openCount === 0 ? { ...day, note: "Full" } : day,
  );
}
