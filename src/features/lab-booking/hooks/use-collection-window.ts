"use client";

import { useState } from "react";

import type { BookingDay } from "@/lib/schedule";

export type CollectionWindow = {
  date: string | null;
  day: BookingDay | undefined;
  // The chosen window, or null once a refresh has marked it full.
  slot: string | null;
  selectDate: (date: string) => void;
  selectSlot: (slot: string) => void;
};

// The day and window chosen for a home collection, starting on `startDate`
// when it's offered, otherwise the first day with a window open.
export function useCollectionWindow(
  days: BookingDay[],
  startDate?: string,
): CollectionWindow {
  const [date, setDate] = useState<string | null>(
    () =>
      (
        days.find((day) => day.value === startDate) ??
        days.find((day) => day.slots.some((slot) => !slot.disabled)) ??
        days[0]
      )?.value ?? null,
  );
  const [slot, setSlot] = useState<string | null>(null);

  const day = days.find((item) => item.value === date);
  const open =
    slot && day?.slots.some((item) => item.value === slot && !item.disabled)
      ? slot
      : null;

  return {
    date,
    day,
    slot: open,
    selectDate: (value) => {
      setDate(value);
      setSlot(null);
    },
    selectSlot: setSlot,
  };
}
