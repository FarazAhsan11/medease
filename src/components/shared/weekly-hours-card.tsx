import { CopyIcon } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

import { PanelCard } from "@/components/shared/panel-card";
import { WeekdayHoursRow } from "@/components/shared/weekday-hours-row";
import { Button } from "@/components/ui/button";
import {
  MONDAY_FIRST,
  type TimeRange,
  type WeekSchedule,
} from "@/lib/weekly-hours";

type WeeklyHoursCardProps = {
  title: string;
  description: string;
  schedule: WeekSchedule;
  problems: Record<number, string | null>;
  // A state setter: each edit starts from the latest week, not this render's.
  onChange: Dispatch<SetStateAction<WeekSchedule>>;
  defaultRange: TimeRange;
  offLabel: string;
};

const TUESDAY_TO_FRIDAY = [2, 3, 4, 5];

// The week's hours, one row per day, for a form that posts them as JSON.
export function WeeklyHoursCard({
  title,
  description,
  schedule,
  problems,
  onChange,
  defaultRange,
  offLabel,
}: WeeklyHoursCardProps) {
  return (
    <PanelCard
      title={title}
      description={description}
      action={
        schedule[1].length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              onChange((current) => ({
                ...current,
                ...Object.fromEntries(
                  TUESDAY_TO_FRIDAY.map((day) => [
                    day,
                    current[1].map((range) => ({ ...range })),
                  ]),
                ),
              }))
            }
          >
            <CopyIcon aria-hidden />
            Copy Monday to Tue–Fri
          </Button>
        )
      }
    >
      <ul className="divide-y">
        {MONDAY_FIRST.map((weekday) => (
          <WeekdayHoursRow
            key={weekday}
            weekday={weekday}
            ranges={schedule[weekday]}
            problem={problems[weekday]}
            defaultRange={defaultRange}
            offLabel={offLabel}
            onChange={(next) =>
              onChange((current) => ({ ...current, [weekday]: next }))
            }
          />
        ))}
      </ul>
    </PanelCard>
  );
}
