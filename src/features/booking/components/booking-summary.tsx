import { CalendarCheckIcon, Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatFee } from "@/lib/format";
import type { DateOption, TimeSlot } from "@/lib/schedule";

type BookingSummaryProps = {
  day: DateOption | null;
  slot: TimeSlot | null;
  fee: number;
  pending: boolean;
};

export function BookingSummary({
  day,
  slot,
  fee,
  pending,
}: BookingSummaryProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-muted p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <CalendarCheckIcon
          className="size-5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <p className="text-sm">
          {day && slot ? (
            <>
              <span className="font-medium">
                {day.weekday}, {day.month} {day.day}
              </span>{" "}
              at <span className="font-medium">{slot.label}</span>
              <span className="text-muted-foreground"> · {formatFee(fee)}</span>
            </>
          ) : (
            <span className="text-muted-foreground">No slot selected yet</span>
          )}
        </p>
      </div>
      <Button
        type="submit"
        disabled={!day || !slot || pending}
        className="h-9 gap-2 px-5"
      >
        {pending && <Loader2Icon className="animate-spin" aria-hidden />}
        {pending ? "Booking…" : "Confirm booking"}
      </Button>
    </div>
  );
}
