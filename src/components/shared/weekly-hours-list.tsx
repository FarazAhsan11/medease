import { formatClockTime, weekdayNames } from "@/lib/datetime";

type Hours = { weekday: number; start: string; end: string };

type WeeklyHoursListProps = {
  hours: Hours[];
};

type DayGroup = { first: number; last: number; ranges: string[] };

const mondayFirst = [1, 2, 3, 4, 5, 6, 0];

function shortDay(weekday: number) {
  return weekdayNames[weekday].slice(0, 3);
}

// Days in a row with the same hours share one line: "Mon – Fri".
function groupDays(hours: Hours[]) {
  const groups: DayGroup[] = [];

  for (const weekday of mondayFirst) {
    const ranges = hours
      .filter((item) => item.weekday === weekday)
      .map(
        (item) =>
          `${formatClockTime(item.start)} – ${formatClockTime(item.end)}`,
      );
    const previous = groups.at(-1);

    if (previous?.ranges.join() === ranges.join()) previous.last = weekday;
    else groups.push({ first: weekday, last: weekday, ranges });
  }

  return groups;
}

export function WeeklyHoursList({ hours }: WeeklyHoursListProps) {
  return (
    <dl className="grid gap-2 text-sm">
      {groupDays(hours).map(({ first, last, ranges }) => (
        <div key={first} className="flex justify-between gap-4">
          <dt className="whitespace-nowrap text-muted-foreground">
            {shortDay(first)}
            {first !== last && ` – ${shortDay(last)}`}
          </dt>
          <dd className="text-right whitespace-nowrap">
            {ranges.length > 0 ? (
              ranges.map((range) => (
                <span key={range} className="block">
                  {range}
                </span>
              ))
            ) : (
              <span className="text-muted-foreground">Closed</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
