import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { labRoutes } from "@/config/routes";
import { addDaysToDateKey, formatDateKey } from "@/lib/datetime";

type CollectionDayNavProps = {
  day: string;
  today: string;
};

// The day shown, with the day before and after a tap away.
export function CollectionDayNav({ day, today }: CollectionDayNavProps) {
  const link = (key: string) =>
    key === today ? labRoutes.collections : labRoutes.collectionsOn(key);

  return (
    <nav
      aria-label="Choose a day"
      className="flex items-center justify-between gap-2 rounded-2xl border bg-card p-2"
    >
      <Link
        href={link(addDaysToDateKey(day, -1))}
        className={buttonVariants({ variant: "ghost", size: "icon" })}
        aria-label="Day before"
      >
        <ChevronLeftIcon aria-hidden />
      </Link>
      <div className="text-center">
        <p className="text-sm font-semibold">
          {day === today ? "Today" : formatDateKey(day)}
        </p>
        {day === today ? (
          <p className="text-xs text-muted-foreground">{formatDateKey(day)}</p>
        ) : (
          <Link
            href={labRoutes.collections}
            className="text-xs font-medium text-primary hover:underline"
          >
            Back to today
          </Link>
        )}
      </div>
      <Link
        href={link(addDaysToDateKey(day, 1))}
        className={buttonVariants({ variant: "ghost", size: "icon" })}
        aria-label="Day after"
      >
        <ChevronRightIcon aria-hidden />
      </Link>
    </nav>
  );
}
