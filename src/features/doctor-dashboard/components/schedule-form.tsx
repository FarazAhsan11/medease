"use client";

import { useState } from "react";

import { WeeklyHoursCard } from "@/components/shared/weekly-hours-card";
import { saveSchedule } from "@/features/doctor-dashboard/actions/save-schedule";
import { ScheduleSettingsCard } from "@/features/doctor-dashboard/components/schedule-settings-card";
import { useFormAction } from "@/hooks/use-form-action";
import { initialFormState } from "@/lib/form-state";
import {
  countWeeklySlots,
  findWeekProblems,
  toWeeklyRanges,
  toWeekSchedule,
  type WeeklyRange,
  type WeekSchedule,
} from "@/lib/weekly-hours";

type ScheduleFormProps = {
  hours: WeeklyRange[];
  slotMinutes: number;
  accepting: boolean;
  fee: number;
};

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

  const problems = findWeekProblems(schedule, slotMinutes);
  const hasProblems = Object.values(problems).some(Boolean);

  return (
    <form
      method="post"
      onSubmit={onSubmit}
      className="grid gap-6 xl:grid-cols-[1.5fr_1fr]"
      noValidate
    >
      <input
        type="hidden"
        name="ranges"
        value={JSON.stringify(toWeeklyRanges(schedule))}
      />
      <input type="hidden" name="accepting" value={String(accepting)} />

      <WeeklyHoursCard
        title="Weekly hours"
        description="Patients can only book inside these hours."
        schedule={schedule}
        problems={problems}
        onChange={setSchedule}
        defaultRange={{ start: "09:00", end: "17:00" }}
        offLabel="Unavailable"
      />

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
