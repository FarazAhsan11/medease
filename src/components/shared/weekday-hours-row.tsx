import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { weekdayNames } from "@/lib/datetime";
import { MAX_RANGES_PER_DAY, type TimeRange } from "@/lib/weekly-hours";

type WeekdayHoursRowProps = {
  weekday: number;
  ranges: TimeRange[];
  problem: string | null;
  onChange: (ranges: TimeRange[]) => void;
  // The hours a day starts with when switched on.
  defaultRange: TimeRange;
  // Shown for a day that's switched off, such as "Unavailable".
  offLabel: string;
};

export function WeekdayHoursRow({
  weekday,
  ranges,
  problem,
  onChange,
  defaultRange,
  offLabel,
}: WeekdayHoursRowProps) {
  const name = weekdayNames[weekday];
  const id = `available-${name.toLowerCase()}`;
  const enabled = ranges.length > 0;

  const update = (index: number, patch: Partial<TimeRange>) =>
    onChange(
      ranges.map((range, i) => (i === index ? { ...range, ...patch } : range)),
    );

  return (
    <li className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-start sm:gap-3">
      <div className="flex h-9 items-center gap-3 sm:w-36">
        <Switch
          id={id}
          checked={enabled}
          onCheckedChange={(checked) =>
            onChange(checked ? [{ ...defaultRange }] : [])
          }
        />
        <label htmlFor={id} className="text-sm font-medium">
          {name}
        </label>
      </div>

      {enabled ? (
        <div className="grid flex-1 gap-2">
          {ranges.map((range, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
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
              {index === ranges.length - 1 &&
                ranges.length < MAX_RANGES_PER_DAY && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-primary"
                    onClick={() =>
                      onChange([...ranges, { start: range.end, end: "21:00" }])
                    }
                  >
                    <PlusIcon aria-hidden />
                    Add hours
                  </Button>
                )}
            </div>
          ))}
          {problem && <p className="text-xs text-destructive">{problem}</p>}
        </div>
      ) : (
        <p className="flex h-9 items-center text-sm text-muted-foreground">
          {offLabel}
        </p>
      )}
    </li>
  );
}
