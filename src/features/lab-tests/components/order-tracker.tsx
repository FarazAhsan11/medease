import { CheckIcon } from "lucide-react";

import {
  orderStages,
  type OrderStage,
} from "@/features/lab-tests/data/lab-orders";
import { cn } from "@/lib/utils";

type OrderTrackerProps = {
  stage: OrderStage;
};

export function OrderTracker({ stage }: OrderTrackerProps) {
  const current = orderStages.indexOf(stage);

  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Order progress">
      {orderStages.map((label, index) => {
        const done = index <= current;

        return (
          <li key={label} className="grid gap-2">
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
              {index < orderStages.length - 1 && (
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
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
