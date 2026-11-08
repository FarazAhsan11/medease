"use client";

import { SearchIcon } from "lucide-react";
import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { BookableItem } from "@/features/lab-booking/lib/lab-bookings";
import { formatFee } from "@/lib/format";

// A filter box appears once the list is long enough to need one.
const FILTER_FROM = 8;

type BookingItemPickerProps = {
  items: BookableItem[];
  selected: string[];
  onToggle: (key: string, checked: boolean) => void;
  // Shown when home collection is chosen, to mark items it can't take.
  home: boolean;
  error?: string;
};

export function BookingItemPicker({
  items,
  selected,
  onToggle,
  home,
  error,
}: BookingItemPickerProps) {
  const [filter, setFilter] = useState("");
  const query = filter.trim().toLowerCase();
  // Chosen items stay in view while filtering, so they can be removed.
  const shown = query
    ? items.filter(
        (item) =>
          selected.includes(item.key) ||
          item.name.toLowerCase().includes(query),
      )
    : items;

  return (
    <fieldset
      className="grid min-w-0 gap-3"
      aria-describedby={error ? "lab-booking-items-error" : undefined}
    >
      <legend className="mb-3 text-sm font-medium">
        Tests and packages{" "}
        <span className="font-normal text-muted-foreground">
          ({selected.length} chosen)
        </span>
      </legend>
      {items.length >= FILTER_FROM && (
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter this lab's tests"
            aria-label="Filter this lab's tests"
            className="pl-9"
          />
        </div>
      )}
      <div className="grid max-h-80 gap-1 overflow-y-auto rounded-xl border p-2">
        {shown.length === 0 && (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            No test here matches “{filter.trim()}”.
          </p>
        )}
        {shown.map((item) => (
          <label
            key={item.key}
            className="flex items-start gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted"
          >
            <Checkbox
              className="mt-0.5"
              checked={selected.includes(item.key)}
              onCheckedChange={(checked) => onToggle(item.key, checked)}
            />
            <span className="min-w-0 flex-1">
              <span className="block break-words">{item.name}</span>
              {(item.kind === "package" || (home && !item.homeCollection)) && (
                <span className="block text-xs text-muted-foreground">
                  {item.kind === "package" &&
                    `Package of ${item.testNames.length} tests`}
                  {item.kind === "package" &&
                    home &&
                    !item.homeCollection &&
                    " · "}
                  {home && !item.homeCollection && "Lab visit only"}
                </span>
              )}
            </span>
            <span className="shrink-0 text-muted-foreground">
              {formatFee(item.price)}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id="lab-booking-items-error" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
