"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { dashboards, type DashboardRole } from "@/config/dashboards";
import { createAccount } from "@/features/auth/lib/create-account";
import {
  doctorSignUpSchema,
  labSignUpSchema,
  patientSignUpSchema,
  type SignUpState,
} from "@/features/auth/schemas/sign-up";
import { getPostLoginPath } from "@/lib/auth/redirects";
import { setFlash } from "@/lib/flash.server";
import { formError, validationError } from "@/lib/form-state";

const DOCUMENTS_BUCKET = "doctor-documents";

const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function insertProfile(
  admin: SupabaseClient,
  table: string,
  row: Record<string, unknown>,
) {
  const { error } = await admin.from(table).upsert(row);
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function uploadDocument(admin: SupabaseClient, path: string, file: File) {
  const { error } = await admin.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw new Error(`${DOCUMENTS_BUCKET}: ${error.message}`);

  return path;
}

async function finish(
  role: DashboardRole,
  email: string,
  result: Awaited<ReturnType<typeof createAccount>>,
  next?: string | null,
): Promise<SignUpState> {
  if (result.status === "error") return formError(result.message);

  if (result.status === "confirm-email") {
    return {
      status: "success",
      message: "Check your email to confirm your account.",
      confirmEmail: email,
    };
  }

  await setFlash("success", "Your account is ready. Welcome to MedEase!");
  redirect(next ? getPostLoginPath(role, next) : dashboards[role].home);
}

export async function signUpPatient(
  _previousState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
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

  return finish("patient", email, result, nextPath);
}

export async function signUpDoctor(
  _previousState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const parsed = doctorSignUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error);

  const { firstName, lastName, email, password, profilePhoto, degreeDocument } =
    parsed.data;

  const result = await createAccount({
    role: "doctor",
    email,
    password,
    fullName: `Dr. ${firstName} ${lastName}`,
    saveProfile: async (admin, id) => {
      // Files live in a private bucket under the doctor's own folder.
      const photoPath = profilePhoto
        ? await uploadDocument(
            admin,
            `${id}/photo.${imageExtensions[profilePhoto.type]}`,
            profilePhoto,
          )
        : null;
      const degreePath = degreeDocument
        ? await uploadDocument(admin, `${id}/degree.pdf`, degreeDocument)
        : null;

      await insertProfile(admin, "doctor_profiles", {
        id,
        first_name: firstName,
        last_name: lastName,
        phone: parsed.data.phone,
        age: parsed.data.age,
        gender: parsed.data.gender,
        specialization: parsed.data.specialization,
        license_number: parsed.data.licenseNumber,
        clinic_address: parsed.data.address,
        photo_path: photoPath,
        degree_path: degreePath,
      });
    },
  });

  return finish("doctor", email, result);
}

export async function signUpLab(
  _previousState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
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

  return finish("lab", email, result);
}
