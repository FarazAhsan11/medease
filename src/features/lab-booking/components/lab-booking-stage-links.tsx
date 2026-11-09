import Link from "next/link";

import {
  labBookingStages,
  stageLabels,
  type LabBookingStage,
} from "@/features/lab-booking/lib/lab-bookings";
import { cn } from "@/lib/utils";

type LabBookingStageLinksProps = {
  basePath: string;
  active: LabBookingStage;
  // Bookings waiting at each open stage.
  counts: Partial<Record<LabBookingStage, number>>;
};

// The lab's working lists: to collect, in the lab, finished.
export function LabBookingStageLinks({
  basePath,
  active,
  counts,
}: LabBookingStageLinksProps) {
  return (
    <nav
      aria-label="Bookings by stage"
      className="flex gap-2 overflow-x-auto pb-1"
    >
      {labBookingStages.map((stage) => {
        const count = counts[stage];
        const current = stage === active;

        return (
          <Link
            key={stage}
            href={
              stage === labBookingStages[0]
                ? basePath
                : `${basePath}?stage=${stage}`
            }
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              current
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {stageLabels[stage]}
            {count !== undefined && count > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs",
                  current
                    ? "bg-primary-foreground/20"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
