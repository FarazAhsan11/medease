export type MedicineReminderSettings = {
  enabled: boolean;
  // "HH:MM" on the patient's clock.
  morning: string;
  afternoon: string;
  night: string;
  timezone: string;
};

// The same defaults as the columns of medicine_reminder_settings. Patients have no
// row until they save.
export const defaultMedicineReminders: MedicineReminderSettings = {
  enabled: false,
  morning: "08:00",
  afternoon: "14:00",
  night: "21:00",
  timezone: "Asia/Karachi",
};

export function isTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

// Every zone this server knows, with the saved one kept even if it doesn't list it.
export function timezoneOptions(selected: string) {
  const zones = Intl.supportedValuesOf("timeZone");
  return zones.includes(selected) ? zones : [selected, ...zones];
}
