// The medical profile a doctor sees for the person an appointment is for (PRO-02).
// The patient keeps it in settings; it's self-reported. Safe to import from
// client components.

export type MedicalProfile = {
  id: string;
  // "self" is the account holder; other values are family members (PRO-03).
  relation: string;
  name: string;
  // "34 years", "8 months", worked out on the server when loaded.
  age: string | null;
  gender: string | null;
  bloodGroup: string | null;
  heightCm: number | null;
  weightKg: number | null;
  allergies: string[];
  chronicConditions: string[];
  currentMedicines: string[];
  updatedAt: string;
};

export type MedicalProfileRow = {
  id: string;
  relation: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  height_cm: number | null;
  weight_kg: number | string | null;
  allergies: string[];
  chronic_conditions: string[];
  current_medicines: string[];
  updated_at: string;
};

export const MEDICAL_PROFILE_COLUMNS =
  "id, relation, first_name, last_name, date_of_birth, gender, blood_group, height_cm, weight_kg, allergies, chronic_conditions, current_medicines, updated_at";

// Whole months from a "YYYY-MM-DD" birth date to "YYYY-MM-DD" today.
function monthsBetween(from: string, to: string) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0);
}

// Years from age 2, months below it, as doctors usually state an infant's age.
export function describeAge(dateOfBirth: string, today: string) {
  const months = monthsBetween(dateOfBirth, today);
  if (months < 0) return null;
  if (months < 1) return "Under 1 month";
  if (months < 24) return months === 1 ? "1 month" : `${months} months`;
  return `${Math.floor(months / 12)} years`;
}

export function toMedicalProfile(
  row: MedicalProfileRow,
  today: string,
): MedicalProfile {
  return {
    id: row.id,
    relation: row.relation,
    name: `${row.first_name} ${row.last_name}`.trim(),
    age: row.date_of_birth ? describeAge(row.date_of_birth, today) : null,
    gender: row.gender,
    bloodGroup: row.blood_group,
    heightCm: row.height_cm,
    // numeric can arrive as text; keep it a number.
    weightKg: row.weight_kg == null ? null : Number(row.weight_kg),
    allergies: row.allergies,
    chronicConditions: row.chronic_conditions,
    currentMedicines: row.current_medicines,
    updatedAt: row.updated_at,
  };
}
