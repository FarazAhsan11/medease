export type DayAvailability = {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
};

export const weeklyAvailability: DayAvailability[] = [
  { day: "Monday", enabled: true, start: "11:00", end: "16:00" },
  { day: "Tuesday", enabled: true, start: "11:00", end: "16:00" },
  { day: "Wednesday", enabled: true, start: "11:00", end: "16:00" },
  { day: "Thursday", enabled: true, start: "11:00", end: "16:00" },
  { day: "Friday", enabled: true, start: "11:00", end: "14:00" },
  { day: "Saturday", enabled: true, start: "10:00", end: "13:00" },
  { day: "Sunday", enabled: false, start: "10:00", end: "13:00" },
];

export const slotDurations = ["15 minutes", "20 minutes", "30 minutes"];
