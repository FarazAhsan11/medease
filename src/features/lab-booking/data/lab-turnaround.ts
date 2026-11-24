import "server-only";

import { createClient } from "@/lib/supabase/server";

// How the lab keeps its promised turnaround (LAB-19), from get_lab_turnaround.
export type LabTurnaround = {
  // Samples in the lab past their due time now.
  overdue: number;
  // Over the last TURNAROUND_DAYS days: reports released, those with a
  // promise, those on time, and the median hours from collection to report.
  reported: number;
  timed: number;
  onTime: number;
  medianHours: number | null;
};

export const TURNAROUND_DAYS = 30;

export async function getLabTurnaround(): Promise<LabTurnaround> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("get_lab_turnaround", { p_days: TURNAROUND_DAYS })
    .single<{
      overdue: number;
      reported: number;
      timed: number;
      on_time: number;
      median_hours: number | string | null;
    }>();

  if (error) throw new Error(`get_lab_turnaround: ${error.message}`);
  return {
    overdue: data.overdue,
    reported: data.reported,
    timed: data.timed,
    onTime: data.on_time,
    medianHours: data.median_hours === null ? null : Number(data.median_hours),
  };
}
