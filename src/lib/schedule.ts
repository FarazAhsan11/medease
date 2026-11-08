export type DateOption = {
  value: string;
  weekday: string;
  day: string;
  month: string;
  // Short status under the date, e.g. "Full".
  note?: string;
};

export type TimeSlot = {
  value: string;
  label: string;
  disabled?: boolean;
  // Short status under the time, e.g. "Booked".
  note?: string;
};
