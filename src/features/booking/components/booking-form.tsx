"use client";

import { useState } from "react";

import { DatePickerChips } from "@/components/shared/date-picker-chips";
import { TimeSlotPicker } from "@/components/shared/time-slot-picker";
import { BookingSummary } from "@/features/booking/components/booking-summary";
import type { DateOption, TimeSlot } from "@/lib/schedule";

type BookingFormProps = {
  dates: DateOption[];
  timeSlots: TimeSlot[];
};

export function BookingForm({ dates, timeSlots }: BookingFormProps) {
  const [selectedDate, setSelectedDate] = useState<DateOption | null>(null);
  const [selectedTime, setSelectedTime] = useState<TimeSlot | null>(null);

  return (
    <section className="min-w-0 space-y-6 rounded-2xl border bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold">Book an appointment</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a date and time that works for you.
        </p>
      </div>

      <DatePickerChips
        dates={dates}
        value={selectedDate?.value ?? null}
        onChange={(date) => {
          setSelectedDate(date);
          setSelectedTime(null);
        }}
      />

      <TimeSlotPicker
        slots={timeSlots}
        value={selectedTime?.value ?? null}
        onChange={setSelectedTime}
        disabled={!selectedDate}
        hint={
          selectedDate ? undefined : "Pick a date first to see available times."
        }
      />

      <BookingSummary date={selectedDate} time={selectedTime} />
    </section>
  );
}
