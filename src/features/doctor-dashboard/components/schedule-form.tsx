"use client";

import { CopyIcon } from "lucide-react";
import { useState } from "react";

import { PanelCard } from "@/components/shared/panel-card";
import { Button } from "@/components/ui/button";
import { saveSchedule } from "@/features/doctor-dashboard/actions/save-schedule";
import { ScheduleSettingsCard } from "@/features/doctor-dashboard/components/schedule-settings-card";
import { WeekdayHoursRow } from "@/features/doctor-dashboard/components/weekday-hours-row";
import {
  countWeeklySlots,
  findDayProblem,
  toWeekSchedule,
  type WeekSchedule,
} from "@/features/doctor-dashboard/lib/schedule";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";

type ScheduleFormProps = {
  hours: { weekday: number; start: string; end: string }[];
  slotMinutes: number;
  accepting: boolean;
  fee: number;
};

const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAYS = [2, 3, 4, 5];

export function ScheduleForm(props: ScheduleFormProps) {
  const [schedule, setSchedule] = useState<WeekSchedule>(() =>
    toWeekSchedule(props.hours),
  );
  const [slotMinutes, setSlotMinutes] = useState(props.slotMinutes);
  const [accepting, setAccepting] = useState(props.accepting);
  const [fee, setFee] = useState(String(props.fee));
  const { pending, onSubmit, fieldError } = useFormAction(
    saveSchedule,
    initialFormState,
  );

  const problems = Object.fromEntries(
    MONDAY_FIRST.map((day) => [
      day,
      findDayProblem(schedule[day], slotMinutes),
    ]),
  );
  const hasProblems = Object.values(problems).some(Boolean);
  const ranges = MONDAY_FIRST.flatMap((weekday) =>
    schedule[weekday].map((range) => ({ weekday, ...range })),
  );

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-6 xl:grid-cols-[1.5fr_1fr]"
      noValidate
    >
      <input type="hidden" name="ranges" value={JSON.stringify(ranges)} />
      <input type="hidden" name="accepting" value={String(accepting)} />

      <PanelCard
        title="Weekly hours"
        description="Patients can only book inside these hours."
        action={
          schedule[1].length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                setSchedule((current) => ({
                  ...current,
                  ...Object.fromEntries(
                    WEEKDAYS.map((day) => [
                      day,
                      current[1].map((r) => ({ ...r })),
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
              onChange={(next) =>
                setSchedule((current) => ({ ...current, [weekday]: next }))
              }
            />
          ))}
        </ul>
      </PanelCard>

      <ScheduleSettingsCard
        slotMinutes={slotMinutes}
        onSlotMinutesChange={setSlotMinutes}
        fee={fee}
        onFeeChange={setFee}
        accepting={accepting}
        onAcceptingChange={setAccepting}
        weeklySlots={countWeeklySlots(schedule, slotMinutes)}
        hasProblems={hasProblems}
        pending={pending}
        feeError={fieldError("fee")}
      />
    </form>
  );
}
