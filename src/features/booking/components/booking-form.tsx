"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DatePickerChips } from "@/components/shared/date-picker-chips";
import { FormField, fieldErrorProps } from "@/components/shared/form-field";
import { TimeSlotPicker } from "@/components/shared/time-slot-picker";
import { Textarea } from "@/components/ui/textarea";
import { bookAppointment } from "@/features/booking/actions/book-appointment";
import { BookingSummary } from "@/features/booking/components/booking-summary";
import type { BookingDay } from "@/features/booking/data/doctor-slots";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";
import type { TimeSlot } from "@/lib/schedule";

type BookingFormProps = {
  doctorId: string;
  fee: number;
  days: BookingDay[];
};

// Codes meaning our copy of the slots is stale: fetch fresh ones.
const staleSlotCodes = new Set(["slot_taken", "slot_unavailable"]);

export function BookingForm({ doctorId, fee, days }: BookingFormProps) {
  const router = useRouter();
  const [dateKey, setDateKey] = useState(
    () => days.find((day) => day.openCount > 0)?.value ?? days[0]?.value,
  );
  const [slot, setSlot] = useState<TimeSlot | null>(null);
  const { state, pending, onSubmit, fieldError } = useFormAction(
    bookAppointment,
    initialFormState,
  );

  const day = days.find((item) => item.value === dateKey) ?? null;
  // Drop a selection that a refresh has since marked as booked.
  const selected =
    slot &&
    day?.slots.some((item) => item.value === slot.value && !item.disabled)
      ? slot
      : null;

  useEffect(() => {
    if (state.code && staleSlotCodes.has(state.code)) router.refresh();
  }, [state, router]);

  // Coming back to the tab: someone may have booked in the meantime.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  return (
    <form
      onSubmit={onSubmit}
      className="min-w-0 space-y-6 rounded-2xl border bg-card p-6"
      noValidate
    >
      <input type="hidden" name="doctorId" value={doctorId} />
      <input type="hidden" name="startsAt" value={selected?.value ?? ""} />

      <div>
        <h2 className="text-lg font-semibold">Book an appointment</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a date and time that works for you. Times are in clinic time.
        </p>
      </div>

      <DatePickerChips
        dates={days}
        value={dateKey ?? null}
        onChange={(date) => {
          setDateKey(date.value);
          setSlot(null);
        }}
      />

      <TimeSlotPicker
        slots={day?.slots ?? []}
        value={selected?.value ?? null}
        onChange={setSlot}
        hint={
          day && day.openCount === 0
            ? "Every slot on this day is booked. Try another date."
            : fieldError("startsAt")
        }
      />

      <FormField
        id="booking-reason"
        label="Reason for visit"
        hint="Optional. Helps the doctor prepare."
        error={fieldError("reason")}
      >
        <Textarea
          id="booking-reason"
          name="reason"
          rows={3}
          maxLength={500}
          placeholder="e.g. Chest pain when climbing stairs for the past week"
          {...fieldErrorProps("booking-reason", fieldError("reason"))}
        />
      </FormField>

      <BookingSummary day={day} slot={selected} fee={fee} pending={pending} />
    </form>
  );
}
