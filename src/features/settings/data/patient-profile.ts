import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type PatientProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  homeAddress: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  bloodGroup: string | null;
  heightCm: number | null;
  weightKg: number | null;
  allergies: string[];
  chronicConditions: string[];
  currentMedicines: string[];
};

type ProfileRow = {
  first_name: string;
  last_name: string;
  phone: string;
  home_address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
};

type MedicalRow = {
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  allergies: string[];
  chronic_conditions: string[];
  current_medicines: string[];
};

// The signed-in patient's own details (row level security allows only that).
// Contact details live on the account, medical details on their `self` row in
// care_recipients.
export const getPatientProfile = cache(
  async (userId: string, email: string): Promise<PatientProfile | null> => {
    const supabase = await createClient();
    const [profile, medical] = await Promise.all([
      supabase
        .from("patient_profiles")
        .select(
          "first_name, last_name, phone, home_address, emergency_contact_name, emergency_contact_phone",
        )
        .eq("id", userId)
        .maybeSingle<ProfileRow>(),
      supabase
        .from("care_recipients")
        .select(
          "date_of_birth, gender, blood_group, height_cm, weight_kg, allergies, chronic_conditions, current_medicines",
        )
        .eq("account_id", userId)
        .eq("relation", "self")
        .maybeSingle<MedicalRow>(),
    ]);

    if (profile.error) {
      throw new Error(`patient_profiles: ${profile.error.message}`);
    }
    if (medical.error) {
      throw new Error(`care_recipients: ${medical.error.message}`);
    }
    if (!profile.data) return null;

    return {
      firstName: profile.data.first_name,
      lastName: profile.data.last_name,
      email,
      phone: profile.data.phone,
      homeAddress: profile.data.home_address,
      emergencyContactName: profile.data.emergency_contact_name,
      emergencyContactPhone: profile.data.emergency_contact_phone,
      dateOfBirth: medical.data?.date_of_birth ?? null,
      gender: medical.data?.gender ?? null,
      bloodGroup: medical.data?.blood_group ?? null,
      heightCm: medical.data?.height_cm ?? null,
      // numeric comes back from the API as a number, but as text from some
      // clients; keep it a number either way.
      weightKg:
        medical.data?.weight_kg == null ? null : Number(medical.data.weight_kg),
      allergies: medical.data?.allergies ?? [],
      chronicConditions: medical.data?.chronic_conditions ?? [],
      currentMedicines: medical.data?.current_medicines ?? [],
    };
  },
);
