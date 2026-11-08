// Weekly hours rules shared by the editors (instant feedback) and the save
// actions (the real check), for doctors' booking hours and labs' collection
// hours. The database enforces them again on save.

import { z } from "zod";

export const MAX_RANGES_PER_DAY = 3;
// Editors list the week from Monday; 0 is Sunday.
export const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];

export type TimeRange = { start: string; end: string };
export type WeekSchedule = Record<number, TimeRange[]>;
export type WeeklyRange = TimeRange & { weekday: number };

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

// Each weekday's first problem, keyed by weekday.
export const findWeekProblems = (
  schedule: WeekSchedule,
  slotMinutes: number,
): Record<number, string | null> =>
  Object.fromEntries(
    MONDAY_FIRST.map((day) => [
      day,
      findDayProblem(schedule[day], slotMinutes),
    ]),
  );

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

export function toWeekSchedule(hours: WeeklyRange[]): WeekSchedule {
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

// The week as the list the save functions take, Monday first.
export const toWeeklyRanges = (schedule: WeekSchedule): WeeklyRange[] =>
  MONDAY_FIRST.flatMap((weekday) =>
    schedule[weekday].map((range) => ({ weekday, ...range })),
  );

// The editors post the week as JSON in one hidden field.
export function parseRangesField(value: FormDataEntryValue | null) {
  try {
    return JSON.parse(String(value ?? "[]")) as unknown;
  } catch {
    return null;
  }
}

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a valid time like 09:30.");

export const weeklyRangesSchema = (maxRanges: number) =>
  z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        start: time,
        end: time,
      }),
    )
    .max(maxRanges, "That's too many time ranges.");

// The first day's problem as a Zod issue on "ranges", for superRefine.
export function checkWeek(
  ranges: WeeklyRange[],
  slotMinutes: number,
  ctx: z.RefinementCtx,
) {
  for (const problem of Object.values(
    findWeekProblems(toWeekSchedule(ranges), slotMinutes),
  )) {
    if (problem) {
      ctx.addIssue({ code: "custom", path: ["ranges"], message: problem });
      return;
    }
  }
}
