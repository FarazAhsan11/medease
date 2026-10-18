import { formatClockTime, weekdayNames } from "@/lib/datetime";

type WeeklyHoursListProps = {
  hours: { weekday: number; start: string; end: string }[];
};

// Monday-first, one line per day: "Mon  10:00 AM – 1:00 PM, 5:00 PM – 8:00 PM".
const order = [1, 2, 3, 4, 5, 6, 0];

export function WeeklyHoursList({ hours }: WeeklyHoursListProps) {
  return (
    <dl className="grid gap-1.5 text-sm">
      {order.map((weekday) => {
        const ranges = hours.filter((item) => item.weekday === weekday);

        return (
          <div key={weekday} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">
              {weekdayNames[weekday].slice(0, 3)}
            </dt>
            <dd className="text-right">
              {ranges.length > 0 ? (
                ranges
                  .map(
                    (range) =>
                      `${formatClockTime(range.start)} – ${formatClockTime(range.end)}`,
                  )
                  .join(", ")
              ) : (
                <span className="text-muted-foreground">Closed</span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
