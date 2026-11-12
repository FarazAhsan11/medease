"use client";

import { SearchIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

// A filter box appears once the list is long enough to need one.
const FILTER_FROM = 8;

export type CheckboxListItem = {
  key: string;
  label: string;
  // A line under the label, e.g. "Lab visit only".
  detail?: ReactNode;
  // Right-aligned, e.g. a price.
  aside?: ReactNode;
  // Can't be changed here, e.g. a test the patient has already booked.
  disabled?: boolean;
};

type CheckboxListPickerProps = {
  id: string;
  legend: string;
  filterLabel: string;
  items: CheckboxListItem[];
  selected: string[];
  onToggle: (key: string, checked: boolean) => void;
  error?: string;
};

// A scrolling list of checkboxes with a filter, showing how many are chosen.
export function CheckboxListPicker({
  id,
  legend,
  filterLabel,
  items,
  selected,
  onToggle,
  error,
}: CheckboxListPickerProps) {
  const [filter, setFilter] = useState("");
  const query = filter.trim().toLowerCase();
  // Chosen items stay in view while filtering, so they can be removed.
  const shown = query
    ? items.filter(
        (item) =>
          selected.includes(item.key) ||
          item.label.toLowerCase().includes(query),
      )
    : items;
  const errorId = `${id}-error`;

  return (
    <fieldset
      className="grid min-w-0 gap-3"
      aria-describedby={error ? errorId : undefined}
    >
      <legend className="mb-3 text-sm font-medium">
        {legend}{" "}
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
            placeholder={filterLabel}
            aria-label={filterLabel}
            className="pl-9"
          />
        </div>
      )}
      <div className="grid max-h-80 gap-1 overflow-y-auto rounded-xl border p-2">
        {shown.length === 0 && (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            Nothing here matches “{filter.trim()}”.
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
              disabled={item.disabled}
              onCheckedChange={(checked) => onToggle(item.key, checked)}
            />
            <span className="min-w-0 flex-1">
              <span className="block break-words">{item.label}</span>
              {item.detail && (
                <span className="block text-xs text-muted-foreground">
                  {item.detail}
                </span>
              )}
            </span>
            {item.aside && (
              <span className="shrink-0 text-muted-foreground">
                {item.aside}
              </span>
            )}
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
