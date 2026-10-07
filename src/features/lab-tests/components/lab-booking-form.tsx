"use client";

import { Building2Icon, HouseIcon } from "lucide-react";
import { useState } from "react";

import { DatePickerChips } from "@/components/shared/date-picker-chips";
import { FormField } from "@/components/shared/form-field";
import { SelectableChip } from "@/components/shared/selectable-chip";
import { TimeSlotPicker } from "@/components/shared/time-slot-picker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { DateOption, TimeSlot } from "@/lib/schedule";

type LabBookingFormProps = {
  dates: DateOption[];
  timeSlots: TimeSlot[];
};

const collectionModes = [
  {
    value: "home",
    icon: HouseIcon,
    title: "Home collection",
    description: "We visit you · Free",
  },
  {
    value: "lab",
    icon: Building2Icon,
    title: "Visit the lab",
    description: "Walk in at your slot",
  },
] as const;

type CollectionMode = (typeof collectionModes)[number]["value"];

export function LabBookingForm({ dates, timeSlots }: LabBookingFormProps) {
  const [mode, setMode] = useState<CollectionMode>("home");
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);

  return (
    <section className="min-w-0 space-y-6 rounded-2xl border bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold">Schedule your test</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how you&apos;d like to give your sample.
        </p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Collection type</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {collectionModes.map(({ value, icon: Icon, title, description }) => (
            <SelectableChip
              key={value}
              active={mode === value}
              onSelect={() => setMode(value)}
              className="flex items-center gap-3 p-4 text-left"
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              <span>
                <span className="block font-medium">{title}</span>
                <span className="block text-xs opacity-70">{description}</span>
              </span>
            </SelectableChip>
          ))}
        </div>
      </fieldset>

      <DatePickerChips
        dates={dates}
        value={date}
        onChange={(option) => setDate(option.value)}
      />
      <TimeSlotPicker
        slots={timeSlots}
        value={time}
        onChange={(slot) => setTime(slot.value)}
      />

      {mode === "home" && (
        <FormField id="collection-address" label="Collection address">
          <Textarea
            id="collection-address"
            rows={2}
            placeholder="House number, street, area, city"
          />
        </FormField>
      )}

      <div className="flex justify-end border-t pt-5">
        <Button type="button" disabled={!date || !time} className="h-9 px-5">
          Confirm booking
        </Button>
      </div>
    </section>
  );
}
