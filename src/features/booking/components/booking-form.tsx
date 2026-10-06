"use client";

import { useState } from "react";

import { BookingSummary } from "@/features/booking/components/booking-summary";
import { SelectableChip } from "@/features/booking/components/selectable-chip";
import type { DateOption, TimeSlot } from "@/features/booking/lib/schedule";

type BookingFormProps = {
  dates: DateOption[];
  timeSlots: TimeSlot[];
};

export function BookingForm({ dates, timeSlots }: BookingFormProps) {
  const [selectedDate, setSelectedDate] = useState<DateOption | null>(null);
  const [selectedTime, setSelectedTime] = useState<TimeSlot | null>(null);

  return (
    <section className="rounded-2xl border bg-card p-6">
      <h2 className="text-lg font-semibold">Book an appointment</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose a date and time that works for you.
      </p>

      <fieldset className="mt-6">
        <legend className="text-sm font-medium">Select date</legend>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {dates.map((date) => (
            <SelectableChip
              key={date.value}
              active={selectedDate?.value === date.value}
              onSelect={() => {
                setSelectedDate(date);
                setSelectedTime(null);
              }}
              className="flex w-16 shrink-0 flex-col items-center py-2.5"
            >
              <span className="text-xs opacity-70">{date.weekday}</span>
              <span className="text-base font-semibold">{date.day}</span>
              <span className="text-xs opacity-70">{date.month}</span>
            </SelectableChip>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-6" disabled={!selectedDate}>
        <legend className="text-sm font-medium">Select time</legend>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {timeSlots.map((slot) => (
            <SelectableChip
              key={slot.value}
              active={selectedTime?.value === slot.value}
              onSelect={() => setSelectedTime(slot)}
              className="py-2"
            >
              {slot.label}
            </SelectableChip>
          ))}
        </div>
        {!selectedDate && (
          <p className="mt-2 text-xs text-muted-foreground">
            Pick a date first to see available times.
          </p>
        )}
      </fieldset>

      <BookingSummary date={selectedDate} time={selectedTime} />
    </section>
  );
}
