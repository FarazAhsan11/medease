"use client";

import { DatePickerChips } from "@/components/shared/date-picker-chips";
import { TimeSlotPicker } from "@/components/shared/time-slot-picker";
import type { CollectionWindow } from "@/features/lab-booking/hooks/use-collection-window";
import type { BookingDay } from "@/lib/schedule";

type CollectionWindowPickerProps = {
  days: BookingDay[];
  selection: CollectionWindow;
  error?: string;
};

// A day, then a collection window on it, for booking or moving a home
// collection. Full windows stay in the list, marked.
export function CollectionWindowPicker({
  days,
  selection,
  error,
}: CollectionWindowPickerProps) {
  const full = selection.day?.slots.every((slot) => slot.disabled) ?? false;

  return (
    <>
      <DatePickerChips
        dates={days}
        value={selection.date}
        onChange={(date) => selection.selectDate(date.value)}
      />
      <TimeSlotPicker
        slots={selection.day?.slots ?? []}
        value={selection.slot}
        onChange={(slot) => selection.selectSlot(slot.value)}
        hint={
          full
            ? "Every window on this day is full. Try another date."
            : (error ??
              "The collector arrives during the window that starts at this time.")
        }
      />
    </>
  );
}
