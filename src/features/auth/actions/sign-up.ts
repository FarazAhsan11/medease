"use server";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAccount } from "@/features/auth/lib/create-account";
import {
  doctorSignUpSchema,
  labSignUpSchema,
  patientSignUpSchema,
  type SignUpState,
} from "@/features/auth/schemas/sign-up";
import { withFormErrors } from "@/lib/form-action.server";
import { validationError } from "@/lib/form-state";

async function insertProfile(
  admin: SupabaseClient,
  table: string,
  row: Record<string, unknown>,
) {
  const { error } = await admin.from(table).upsert(row);
  if (error) throw new Error(`${table}: ${error.message}`);
}

// Every new account confirms its email before it can log in.
function finish(
  email: string,
  result: Awaited<ReturnType<typeof createAccount>>,
): SignUpState {
  if (result.status === "error") return result.error;

  return {
    status: "success",
    message: "Check your email to confirm your account.",
    confirmEmail: email,
  };
}

export const signUpPatient = withFormErrors(
  async (_previousState: SignUpState, formData: FormData) => {
    const parsed = patientSignUpSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    const { firstName, lastName, email, phone, password } = parsed.data;
    const next = formData.get("next");
    const nextPath = typeof next === "string" ? next : null;

    const result = await createAccount({
      role: "patient",
      email,
      password,
      fullName: `${firstName} ${lastName}`,
      next: nextPath,
      saveProfile: (admin, id) =>
        insertProfile(admin, "patient_profiles", {
          id,
          first_name: firstName,
          last_name: lastName,
          phone,
        }),
    });

    return finish(email, result);
  },
);

export const signUpDoctor = withFormErrors(
  async (_previousState: SignUpState, formData: FormData) => {
    const parsed = doctorSignUpSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationError(parsed.error);

    const { firstName, lastName, email, password } = parsed.data;

    // Documents come later, from the verification page once they've signed in.
    const result = await createAccount({
      role: "doctor",
      email,
      password,
      fullName: `Dr. ${firstName} ${lastName}`,
      saveProfile: (admin, id) =>
        insertProfile(admin, "doctor_profiles", {
          id,
          first_name: firstName,
          last_name: lastName,
          phone: parsed.data.phone,
          age: parsed.data.age,
          gender: parsed.data.gender,
          specialization: parsed.data.specialization,
          license_number: parsed.data.licenseNumber,
          clinic_address: parsed.data.address,
        }),
    });

    return finish(email, result);
  },
);

export const signUpLab = withFormErrors(
  async (_previousState: SignUpState, formData: FormData) => {
    const parsed = labSignUpSchema.safeParse({
      ...Object.fromEntries(formData),
      services: formData.getAll("services"),
    });
    if (!parsed.success) return validationError(parsed.error);

    const { labName, email, password } = parsed.data;

    const result = await createAccount({
      role: "lab",
      email,
      password,
      fullName: labName,
      saveProfile: (admin, id) =>
        insertProfile(admin, "lab_profiles", {
          id,
          lab_name: labName,
          registration_number: parsed.data.registrationNumber,
          contact_person: parsed.data.contactPerson,
          phone: parsed.data.phone,
          address: parsed.data.address,
          services: parsed.data.services,
        }),
    });

    return finish(email, result);
  },
);
