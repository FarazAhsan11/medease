"use client";

import { CheckboxListPicker } from "@/components/shared/checkbox-list-picker";
import type { BookableItem } from "@/features/lab-booking/lib/lab-bookings";
import { formatFee } from "@/lib/format";

type BookingItemPickerProps = {
  items: BookableItem[];
  selected: string[];
  onToggle: (key: string, checked: boolean) => void;
  // Shown when home collection is chosen, to mark items it can't take.
  home: boolean;
  error?: string;
};

function itemDetail(item: BookableItem, home: boolean) {
  const notes = [
    item.kind === "package" && `Package of ${item.testNames.length} tests`,
    home && !item.homeCollection && "Lab visit only",
  ].filter(Boolean);
  return notes.length > 0 ? notes.join(" · ") : undefined;
}

export function BookingItemPicker({
  items,
  selected,
  onToggle,
  home,
  error,
}: BookingItemPickerProps) {
  return (
    <CheckboxListPicker
      id="lab-booking-items"
      legend="Tests and packages"
      filterLabel="Filter this lab's tests"
      items={items.map((item) => ({
        key: item.key,
        label: item.name,
        detail: itemDetail(item, home),
        aside: formatFee(item.price),
      }))}
      selected={selected}
      onToggle={onToggle}
      error={error}
    />
  );
}
