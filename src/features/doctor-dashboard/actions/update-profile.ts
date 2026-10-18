"use server";

import { refresh } from "next/cache";

import { doctorProfileSchema } from "@/features/doctor-dashboard/schemas/profile";
import { getSessionUser } from "@/lib/auth/session";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

// Row level security limits this to the doctor's own row, and column grants
// keep verified fields (license, documents) out of reach.
export const updateDoctorProfile = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = doctorProfileSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    const user = await getSessionUser();
    if (user?.role !== "doctor") {
      return formError("Only doctors can edit a doctor profile.", "not_doctor");
    }

    const profile = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase
      .from("doctor_profiles")
      .update({
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone: profile.phone,
        age: profile.age,
        gender: profile.gender,
        specialization: profile.specialization,
        experience_years: profile.experienceYears,
        city: profile.city,
        clinic_address: profile.clinicAddress,
        bio: profile.bio,
      })
      .eq("id", user.id);

    if (error) {
      console.error("Profile update failed:", error.code, error.message);
      return formError("We couldn't save your profile. Please try again.");
    }

    refresh();
    return { status: "success", message: "Profile saved." };
  },
);
