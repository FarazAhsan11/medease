export type ScheduleOption = {
  value: string;
  label: string;
};

const BOOKING_WINDOW_DAYS = 30;
const OPENING_HOUR = 11;
const CLOSING_HOUR = 16;

export function getAvailableDates(from = new Date()): ScheduleOption[] {
  const dates: ScheduleOption[] = [];

  for (let offset = 0; offset < BOOKING_WINDOW_DAYS; offset++) {
    const date = new Date(from);
    date.setDate(from.getDate() + offset);

    if (date.getDay() === 0) continue;

    dates.push({
      value: date.toISOString().split("T")[0],
      label: date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    });
  }

  return dates;
}

export function getTimeSlots(): ScheduleOption[] {
  const slots: ScheduleOption[] = [];

  for (let hour = OPENING_HOUR; hour < CLOSING_HOUR; hour++) {
    for (const minutes of [0, 30]) {
      const paddedMinutes = minutes.toString().padStart(2, "0");
      const displayHour = hour > 12 ? hour - 12 : hour;
      const period = hour >= 12 ? "PM" : "AM";

      slots.push({
        value: `${hour.toString().padStart(2, "0")}:${paddedMinutes}`,
        label: `${displayHour}:${paddedMinutes} ${period}`,
      });
    }
  }

  return slots;
}
