import Link from "next/link";

import { patientRoutes } from "@/config/routes";
import {
  timelineTypeLabels,
  timelineTypes,
  type TimelineType,
} from "@/features/health-timeline/lib/health-timeline";
import { cn } from "@/lib/utils";

const options: { type: TimelineType | null; label: string }[] = [
  { type: null, label: "All" },
  ...timelineTypes.map((type) => ({ type, label: timelineTypeLabels[type] })),
];

// Links rather than buttons: the page filters on the server, and the URL
// carries only the record type.
export function TimelineFilter({ active }: { active: TimelineType | null }) {
  return (
    <nav
      aria-label="Show in timeline"
      className="flex gap-2 overflow-x-auto pb-1"
    >
      {options.map(({ type, label }) => {
        const current = type === active;
        return (
          <Link
            key={label}
            href={
              type
                ? `${patientRoutes.records}?type=${type}`
                : patientRoutes.records
            }
            scroll={false}
            aria-current={current ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              current
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
