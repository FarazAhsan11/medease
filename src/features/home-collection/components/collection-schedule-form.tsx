"use client";

import { useState } from "react";

import { WeeklyHoursCard } from "@/components/shared/weekly-hours-card";
import { saveCollectionSchedule } from "@/features/home-collection/actions/save-collection-schedule";
import { CollectionSettingsCard } from "@/features/home-collection/components/collection-settings-card";
import type { CollectionSettings } from "@/features/home-collection/lib/home-collection";
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

type CollectionScheduleFormProps = {
  settings: CollectionSettings;
  hours: WeeklyRange[];
  hasAreas: boolean;
};

// Collection hours and settings, saved together.
export function CollectionScheduleForm({
  settings,
  hours,
  hasAreas,
}: CollectionScheduleFormProps) {
  const [schedule, setSchedule] = useState<WeekSchedule>(() =>
    toWeekSchedule(hours),
  );
  const [accepting, setAccepting] = useState(settings.accepting);
  const [slotMinutes, setSlotMinutes] = useState(settings.slotMinutes);
  const [capacity, setCapacity] = useState(String(settings.capacity));
  const [noticeHours, setNoticeHours] = useState(settings.noticeHours);
  const [freeAbove, setFreeAbove] = useState(
    settings.freeAbove === null ? "" : String(settings.freeAbove),
  );
  const { pending, onSubmit, fieldError } = useFormAction(
    saveCollectionSchedule,
    initialFormState,
  );

  const problems = findWeekProblems(schedule, slotMinutes);

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
        title="Collection hours"
        description="When collectors visit homes. Early mornings suit fasting tests."
        schedule={schedule}
        problems={problems}
        onChange={setSchedule}
        defaultRange={{ start: "07:00", end: "12:00" }}
        offLabel="No collections"
      />

      <CollectionSettingsCard
        accepting={accepting}
        onAcceptingChange={setAccepting}
        hasAreas={hasAreas}
        slotMinutes={slotMinutes}
        onSlotMinutesChange={setSlotMinutes}
        capacity={capacity}
        onCapacityChange={setCapacity}
        noticeHours={noticeHours}
        onNoticeHoursChange={setNoticeHours}
        freeAbove={freeAbove}
        onFreeAboveChange={setFreeAbove}
        weeklySlots={countWeeklySlots(schedule, slotMinutes)}
        hasProblems={Object.values(problems).some(Boolean)}
        pending={pending}
        fieldError={fieldError}
      />
    </form>
  );
}
