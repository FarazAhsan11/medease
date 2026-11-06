// People a patient cares for and books visits for (PRO-03). Safe to import
// from client components.

import type { FamilyRelation } from "@/features/family/lib/relations";
import type { MedicalProfileValues } from "@/features/medical-profile/lib/medical-profile";

// Matches the limit in save_family_member.
export const MAX_FAMILY_MEMBERS = 10;

export type FamilyMember = MedicalProfileValues & {
  id: string;
  relation: FamilyRelation;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string | null;
};

export type FamilyMemberRow = {
  id: string;
  relation: FamilyRelation;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string | null;
  blood_group: string | null;
  height_cm: number | null;
  weight_kg: number | string | null;
  allergies: string[];
  chronic_conditions: string[];
  current_medicines: string[];
};

export const FAMILY_MEMBER_COLUMNS =
  "id, relation, first_name, last_name, date_of_birth, gender, blood_group, height_cm, weight_kg, allergies, chronic_conditions, current_medicines";

export function toFamilyMember(row: FamilyMemberRow): FamilyMember {
  return {
    id: row.id,
    relation: row.relation,
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    bloodGroup: row.blood_group,
    heightCm: row.height_cm,
    // numeric can arrive as text; keep it a number.
    weightKg: row.weight_kg == null ? null : Number(row.weight_kg),
    allergies: row.allergies,
    chronicConditions: row.chronic_conditions,
    currentMedicines: row.current_medicines,
  };
}

export const familyMemberName = (member: {
  firstName: string;
  lastName: string;
}) => `${member.firstName} ${member.lastName}`;

export const familyErrorMessages = {
  not_patient: "Only patients can add family members.",
  invalid_relation: "Select how they're related to you.",
  invalid_date_of_birth: "Enter their real date of birth.",
  invalid_profile: "Some of these details aren't valid. Please check them.",
  too_many_family_members: `You can add up to ${MAX_FAMILY_MEMBERS} family members.`,
  family_member_not_found: "That family member is no longer on your account.",
  family_member_has_records:
    "They have visits or records on your account, so they can't be removed.",
};
