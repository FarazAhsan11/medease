"use server";

import { refresh } from "next/cache";

import { patientProfileSchema } from "@/features/settings/schemas/patient-profile";
import { getSessionUser } from "@/lib/auth/session";
import { databaseErrorState } from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

const profileErrors = {
  not_patient: "Only patients can edit this profile.",
  invalid_date_of_birth: "Enter your real date of birth.",
  invalid_profile: "Some of these details aren't valid. Please check them.",
};

// The function checks the caller and saves both tables together.
export const savePatientProfile = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = patientProfileSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    const user = await getSessionUser();
    if (user?.role !== "patient") {
      return formError(profileErrors.not_patient, "not_patient");
    }

    const profile = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.rpc("save_patient_profile", {
      p_first_name: profile.firstName,
      p_last_name: profile.lastName,
      p_phone: profile.phone,
      p_date_of_birth: profile.dateOfBirth,
      p_gender: profile.gender,
      p_blood_group: profile.bloodGroup,
      p_height_cm: profile.heightCm,
      p_weight_kg: profile.weightKg,
      p_allergies: profile.allergies,
      p_chronic_conditions: profile.chronicConditions,
      p_current_medicines: profile.currentMedicines,
      p_home_address: profile.homeAddress,
      p_emergency_contact_name: profile.emergencyContactName,
      p_emergency_contact_phone: profile.emergencyContactPhone,
    });

    if (error) {
      return databaseErrorState(error, profileErrors, "Saving a profile");
    }

    // The header shows the name from the session, so keep that in step. The
    // profile is already saved, so a failure here only delays the new name.
    const fullName = `${profile.firstName} ${profile.lastName}`;
    if (fullName !== user.name) {
      const { error: nameError } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      });
      if (nameError) {
        console.error("Updating the session name failed:", nameError.code);
      } else {
        await supabase.auth.refreshSession();
      }
    }

    refresh();
    return { status: "success", message: "Profile saved." };
  },
);
