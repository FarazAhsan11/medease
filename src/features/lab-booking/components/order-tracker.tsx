import { CheckIcon } from "lucide-react";

import {
  progressSteps,
  statusLabels,
  type LabBookingStatus,
} from "@/features/lab-booking/lib/lab-bookings";
import { cn } from "@/lib/utils";

type OrderTrackerProps = {
  status: LabBookingStatus;
};

// Where a lab booking is on its way to a report.
export function OrderTracker({ status }: OrderTrackerProps) {
  // A new sample restarts collection; a cancelled booking shows no progress.
  const current =
    status === "recollection_needed"
      ? 0
      : progressSteps.indexOf(status as (typeof progressSteps)[number]);

  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Booking progress">
      {progressSteps.map((step, index) => {
        const done = index <= current;

        return (
          <li
            key={step}
            className="grid gap-2"
            aria-current={index === current ? "step" : undefined}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                  done
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {done ? (
                  <CheckIcon className="size-3" aria-hidden />
                ) : (
                  index + 1
                )}
              </span>
              {index < progressSteps.length - 1 && (
                <span
                  className={cn(
                    "h-0.5 flex-1 rounded-full",
                    index < current ? "bg-primary" : "bg-muted",
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                "text-xs",
                done ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {statusLabels[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
