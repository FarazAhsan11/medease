export type DateOption = {
  value: string;
  weekday: string;
  day: string;
  month: string;
};

export type TimeSlot = {
  value: string;
  label: string;
};

const BOOKING_WINDOW_DAYS = 14;
const OPENING_HOUR = 11;
const CLOSING_HOUR = 16;

export function getAvailableDates(from = new Date()): DateOption[] {
  const dates: DateOption[] = [];

  for (let offset = 0; offset < BOOKING_WINDOW_DAYS; offset++) {
    const date = new Date(from);
    date.setDate(from.getDate() + offset);

    if (date.getDay() === 0) continue;

    dates.push({
      value: date.toISOString().split("T")[0],
      weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
      day: date.toLocaleDateString("en-US", { day: "numeric" }),
      month: date.toLocaleDateString("en-US", { month: "short" }),
    });
  }

  return dates;
}

export function getTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];

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
