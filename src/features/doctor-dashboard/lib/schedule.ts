// Weekly schedule rules shared by the editor (instant feedback) and the save
// action (the real check). The database enforces them again on save.

export const SLOT_LENGTHS = [10, 15, 20, 30, 45, 60] as const;
export const MAX_RANGES_PER_DAY = 3;

export type TimeRange = { start: string; end: string };
export type WeekSchedule = Record<number, TimeRange[]>;

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// First problem with one day's hours, or null when they're fine.
export function findDayProblem(ranges: TimeRange[], slotMinutes: number) {
  if (ranges.length > MAX_RANGES_PER_DAY) {
    return `Use at most ${MAX_RANGES_PER_DAY} time ranges per day.`;
  }

  const sorted = [...ranges].sort(
    (a, b) => toMinutes(a.start) - toMinutes(b.start),
  );
  for (const [index, range] of sorted.entries()) {
    const length = toMinutes(range.end) - toMinutes(range.start);
    if (length <= 0) return "Each end time must be after its start time.";
    if (length < slotMinutes) {
      return `Each range must fit at least one ${slotMinutes}-minute slot.`;
    }
    const next = sorted[index + 1];
    if (next && toMinutes(next.start) < toMinutes(range.end)) {
      return "Time ranges on the same day can't overlap.";
    }
  }

  return null;
}

export function countWeeklySlots(schedule: WeekSchedule, slotMinutes: number) {
  return Object.values(schedule)
    .flat()
    .reduce(
      (total, range) =>
        total +
        Math.max(
          0,
          Math.floor(
            (toMinutes(range.end) - toMinutes(range.start)) / slotMinutes,
          ),
        ),
      0,
    );
}

export function toWeekSchedule(
  hours: { weekday: number; start: string; end: string }[],
): WeekSchedule {
  const schedule: WeekSchedule = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  };
  for (const { weekday, start, end } of hours) {
    schedule[weekday].push({ start, end });
  }
  return schedule;
}
