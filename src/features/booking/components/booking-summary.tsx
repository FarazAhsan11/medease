import { CalendarCheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DateOption, TimeSlot } from "@/lib/schedule";

type BookingSummaryProps = {
  date: DateOption | null;
  time: TimeSlot | null;
};

export function BookingSummary({ date, time }: BookingSummaryProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-muted p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <CalendarCheckIcon
          className="size-5 text-muted-foreground"
          aria-hidden
        />
        <p className="text-sm">
          {date && time ? (
            <>
              <span className="font-medium">
                {date.weekday}, {date.month} {date.day}
              </span>{" "}
              at <span className="font-medium">{time.label}</span>
            </>
          ) : (
            <span className="text-muted-foreground">No slot selected yet</span>
          )}
        </p>
      </div>
      <Button type="button" disabled={!date || !time} className="h-9 px-5">
        Confirm booking
      </Button>
    </div>
  );
}
