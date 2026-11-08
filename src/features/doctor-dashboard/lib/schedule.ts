// Doctor schedule rules on top of the shared weekly hours (src/lib/weekly-hours.ts).
// Match the check on doctor_profiles.slot_minutes.

export const SLOT_LENGTHS = [10, 15, 20, 30, 45, 60] as const;
