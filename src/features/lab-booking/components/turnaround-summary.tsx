import { AlarmClockIcon, CheckCheckIcon, TimerIcon } from "lucide-react";

import { StatGrid } from "@/components/shared/stat-grid";
import {
  TURNAROUND_DAYS,
  type LabTurnaround,
} from "@/features/lab-booking/data/lab-turnaround";

type TurnaroundSummaryProps = {
  turnaround: LabTurnaround;
};

// How the lab keeps its promised turnaround (LAB-19): what's past due now and
// its record over the last month.
export function TurnaroundSummary({ turnaround }: TurnaroundSummaryProps) {
  const { overdue, reported, timed, onTime, medianHours } = turnaround;
  const period = `last ${TURNAROUND_DAYS} days`;

  return (
    <StatGrid
      stats={[
        {
          label: "Past their promised time",
          value: String(overdue),
          hint:
            overdue > 0
              ? "Each is marked overdue on its booking"
              : "Every sample in the lab is on time",
          icon: AlarmClockIcon,
        },
        {
          label: "Reports on time",
          value: timed > 0 ? `${Math.round((onTime / timed) * 100)}%` : "–",
          hint:
            timed > 0
              ? `${onTime} of ${timed} reports, ${period}`
              : reported > 0
                ? `No reports with a promised time, ${period}`
                : `No reports released in the ${period}`,
          icon: CheckCheckIcon,
        },
        {
          label: "Typical turnaround",
          value: medianHours === null ? "–" : `${medianHours} h`,
          hint:
            reported > 0
              ? `Median from sample to report, ${period}`
              : "Shown once reports are released",
          icon: TimerIcon,
        },
      ]}
    />
  );
}
