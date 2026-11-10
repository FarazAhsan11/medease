"use client";

import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DatePickerChips } from "@/components/shared/date-picker-chips";
import { Button } from "@/components/ui/button";
import { rescheduleLabBooking } from "@/features/lab-booking/actions/reschedule-lab-booking";
import { CollectionWindowPicker } from "@/features/lab-booking/components/collection-window-picker";
import { useCollectionWindow } from "@/features/lab-booking/hooks/use-collection-window";
import {
  staleBookingCodes,
  staleChangeCodes,
} from "@/features/lab-booking/lib/lab-bookings";
import { useFormAction } from "@/hooks/use-form-action";
import { useRefreshOnVisible } from "@/hooks/use-refresh-on-visible";
import { initialFormState } from "@/lib/form-state";
import type { BookingDay, DateOption } from "@/lib/schedule";

type RescheduleLabBookingFormProps = {
  bookingId: string;
  collection: "lab" | "home";
  // The booked day, and for home collection the window's start (ISO).
  currentDate: string;
  currentSlot: string | null;
  visitDays: DateOption[];
  collectionDays: BookingDay[];
};

// A new day for a lab visit or a new window for home collection (LAB-20).
// The booking's own time is marked, and choosing it changes nothing.
export function RescheduleLabBookingForm({
  bookingId,
  collection,
  currentDate,
  currentSlot,
  visitDays,
  collectionDays,
}: RescheduleLabBookingFormProps) {
  const router = useRouter();
  const home = collection === "home";
  // Our own window counts against its capacity, so it may read as full.
  const windowDays = collectionDays.map((day) => ({
    ...day,
    slots: day.slots.map((slot) =>
      slot.value === currentSlot
        ? { ...slot, disabled: false, note: "Yours" }
        : slot,
    ),
  }));
  const days = visitDays.map((day) =>
    day.value === currentDate ? { ...day, note: "Yours" } : day,
  );
  const selection = useCollectionWindow(windowDays, currentDate);
  const [visitDate, setVisitDate] = useState<string | null>(null);
  const { state, pending, onSubmit, fieldError } = useFormAction(
    rescheduleLabBooking,
    initialFormState,
  );

  const chosen = home ? selection.slot : visitDate;
  const unchanged = chosen === (home ? currentSlot : currentDate);

  // Fresh windows after a stale pick; the page explains a booking that can
  // no longer move.
  useEffect(() => {
    if (
      state.code &&
      (staleBookingCodes.has(state.code) || staleChangeCodes.has(state.code))
    ) {
      router.refresh();
    }
  }, [state, router]);

  useRefreshOnVisible();

  return (
    <form
      method="post"
      onSubmit={onSubmit}
      className="min-w-0 space-y-6 rounded-2xl border bg-card p-6"
      noValidate
    >
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="collection" value={collection} />
      <input
        type="hidden"
        name="visitDate"
        value={home ? "" : (visitDate ?? "")}
      />
      <input
        type="hidden"
        name="slotStartsAt"
        value={home ? (selection.slot ?? "") : ""}
      />

      <div>
        <h2 className="text-lg font-semibold">Choose a new time</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {home
            ? "Pick another collection window. The tests, address and price stay the same."
            : "Pick another day for your lab visit. The tests and price stay the same."}{" "}
          Times are in Pakistan time.
        </p>
      </div>

      {home ? (
        windowDays.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            The lab has no collection windows open in the next two weeks. Call
            the lab, or cancel and book again.
          </p>
        ) : (
          <CollectionWindowPicker
            days={windowDays}
            selection={selection}
            error={fieldError("slotStartsAt")}
          />
        )
      ) : (
        <div className="space-y-2">
          <DatePickerChips
            dates={days}
            value={visitDate}
            onChange={(date) => setVisitDate(date.value)}
          />
          <p className="text-xs text-muted-foreground">
            {fieldError("visitDate") ??
              "Visit any time the lab is open that day."}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-5">
        {chosen && unchanged && (
          <p className="text-xs text-muted-foreground">
            That&apos;s the time you have now.
          </p>
        )}
        <Button
          type="submit"
          disabled={pending || !chosen || unchanged}
          className="gap-2"
        >
          {pending && <Loader2Icon className="animate-spin" aria-hidden />}
          {pending ? "Saving…" : "Move booking"}
        </Button>
      </div>
    </form>
  );
}
