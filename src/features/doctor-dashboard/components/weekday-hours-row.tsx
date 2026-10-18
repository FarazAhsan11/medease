import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  MAX_RANGES_PER_DAY,
  type TimeRange,
} from "@/features/doctor-dashboard/lib/schedule";
import { weekdayNames } from "@/lib/datetime";

type WeekdayHoursRowProps = {
  weekday: number;
  ranges: TimeRange[];
  problem: string | null;
  onChange: (ranges: TimeRange[]) => void;
};

const DEFAULT_RANGE: TimeRange = { start: "09:00", end: "17:00" };

export function WeekdayHoursRow({
  weekday,
  ranges,
  problem,
  onChange,
}: WeekdayHoursRowProps) {
  const name = weekdayNames[weekday];
  const id = `available-${name.toLowerCase()}`;
  const enabled = ranges.length > 0;

  const update = (index: number, patch: Partial<TimeRange>) =>
    onChange(
      ranges.map((range, i) => (i === index ? { ...range, ...patch } : range)),
    );

  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
      <div className="flex h-9 items-center gap-3 sm:w-36">
        <Switch
          id={id}
          checked={enabled}
          onCheckedChange={(checked) =>
            onChange(checked ? [DEFAULT_RANGE] : [])
          }
        />
        <label htmlFor={id} className="text-sm font-medium">
          {name}
        </label>
      </div>

      {enabled ? (
        <div className="grid flex-1 gap-2">
          {ranges.map((range, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                type="time"
                value={range.start}
                onChange={(event) =>
                  update(index, { start: event.target.value })
                }
                aria-label={`${name} start time ${index + 1}`}
                aria-invalid={Boolean(problem)}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="time"
                value={range.end}
                onChange={(event) => update(index, { end: event.target.value })}
                aria-label={`${name} end time ${index + 1}`}
                aria-invalid={Boolean(problem)}
                className="w-32"
              />
              {ranges.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${name} hours ${index + 1}`}
                  onClick={() => onChange(ranges.filter((_, i) => i !== index))}
                >
                  <Trash2Icon />
                </Button>
              )}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {ranges.length < MAX_RANGES_PER_DAY && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-primary"
                onClick={() =>
                  onChange([
                    ...ranges,
                    { start: ranges.at(-1)?.end ?? "09:00", end: "21:00" },
                  ])
                }
              >
                <PlusIcon aria-hidden />
                Add hours
              </Button>
            )}
            {problem && <p className="text-xs text-destructive">{problem}</p>}
          </div>
        </div>
      ) : (
        <p className="flex h-9 items-center text-sm text-muted-foreground">
          Unavailable
        </p>
      )}
    </li>
  );
}
