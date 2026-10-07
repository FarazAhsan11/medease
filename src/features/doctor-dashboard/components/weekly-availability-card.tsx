import { PanelCard } from "@/components/shared/panel-card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { DayAvailability } from "@/features/doctor-dashboard/data/availability";

type WeeklyAvailabilityCardProps = {
  days: DayAvailability[];
};

export function WeeklyAvailabilityCard({ days }: WeeklyAvailabilityCardProps) {
  return (
    <PanelCard
      title="Weekly hours"
      description="Patients can only book inside these hours."
    >
      <ul className="divide-y">
        {days.map((day) => {
          const id = `available-${day.day.toLowerCase()}`;

          return (
            <li
              key={day.day}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
            >
              <div className="flex items-center gap-3 sm:w-40">
                <Switch id={id} defaultChecked={day.enabled} />
                <label htmlFor={id} className="text-sm font-medium">
                  {day.day}
                </label>
              </div>
              {day.enabled ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    defaultValue={day.start}
                    aria-label={`${day.day} start time`}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">to</span>
                  <Input
                    type="time"
                    defaultValue={day.end}
                    aria-label={`${day.day} end time`}
                    className="w-32"
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Unavailable</p>
              )}
            </li>
          );
        })}
      </ul>
    </PanelCard>
  );
}
