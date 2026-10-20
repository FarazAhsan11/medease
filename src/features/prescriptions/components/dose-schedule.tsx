import { MoonIcon, SunIcon, SunMediumIcon } from "lucide-react";

import {
  DOSE_TIMES,
  doseTimeLabels,
  type DoseTime,
} from "@/features/prescriptions/lib/prescriptions";
import { cn } from "@/lib/utils";

const doseIcons = {
  morning: SunMediumIcon,
  afternoon: SunIcon,
  night: MoonIcon,
};

type DoseScheduleProps = {
  doses: DoseTime[];
};

export function DoseSchedule({ doses }: DoseScheduleProps) {
  return (
    <ul className="grid grid-cols-3 gap-2">
      {DOSE_TIMES.map((time) => {
        const Icon = doseIcons[time];
        const active = doses.includes(time);

        return (
          <li
            key={time}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg border py-2 text-xs",
              active
                ? "border-primary/30 bg-secondary font-medium text-secondary-foreground"
                : "border-dashed text-muted-foreground/60",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {doseTimeLabels[time]}
            <span className="sr-only">{active ? "dose" : "no dose"}</span>
          </li>
        );
      })}
    </ul>
  );
}
