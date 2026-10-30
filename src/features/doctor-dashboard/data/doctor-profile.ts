import "server-only";

import { cache } from "react";

import { DOCUMENTS_BUCKET } from "@/features/doctor-verification/lib/document-rules";
import { DOCUMENT_LINK_SECONDS } from "@/features/doctor-verification/lib/doctor-documents";
import type { VerificationStatus } from "@/features/doctor-verification/lib/verification";
import { createClient } from "@/lib/supabase/server";

export type DoctorProfile = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  age: number;
  gender: string;
  specialization: string;
  licenseNumber: string;
  clinicAddress: string;
  city: string | null;
  bio: string | null;
  experienceYears: number;
  consultationFee: number;
  slotMinutes: number;
  acceptingAppointments: boolean;
  timezone: string;
  createdAt: string;
  verificationStatus: VerificationStatus;
  photoUrl: string | null;
  licenseUrl: string | null;
  degreeUrl: string | null;
};

type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  age: number;
  gender: string;
  specialization: string;
  license_number: string;
  clinic_address: string;
  city: string | null;
  bio: string | null;
  experience_years: number;
  consultation_fee: number;
  slot_minutes: number;
  accepting_appointments: boolean;
  timezone: string;
  created_at: string;
  verification_status: VerificationStatus;
  photo_path: string | null;
  license_document_path: string | null;
  degree_path: string | null;
};

// The signed-in doctor's own profile (row level security allows only that).
// Documents live in a private bucket, so they get short-lived signed links.
export const getDoctorProfile = cache(
  async (doctorId: string): Promise<DoctorProfile | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("doctor_profiles")
      .select(
        "id, first_name, last_name, phone, age, gender, specialization, license_number, clinic_address, city, bio, experience_years, consultation_fee, slot_minutes, accepting_appointments, timezone, created_at, verification_status, photo_path, license_document_path, degree_path",
      )
      .eq("id", doctorId)
      .maybeSingle<ProfileRow>();

    if (error) throw new Error(`doctor_profiles: ${error.message}`);
    if (!data) return null;

    const documents = supabase.storage.from(DOCUMENTS_BUCKET);
    const sign = async (path: string | null) =>
      path
        ? ((await documents.createSignedUrl(path, DOCUMENT_LINK_SECONDS)).data
            ?.signedUrl ?? null)
        : null;
    const [photoUrl, licenseUrl, degreeUrl] = await Promise.all([
      sign(data.photo_path),
      sign(data.license_document_path),
      sign(data.degree_path),
    ]);

    return {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      phone: data.phone,
      age: data.age,
      gender: data.gender,
      specialization: data.specialization,
      licenseNumber: data.license_number,
      clinicAddress: data.clinic_address,
      city: data.city,
      bio: data.bio,
      experienceYears: data.experience_years,
      consultationFee: data.consultation_fee,
      slotMinutes: data.slot_minutes,
      acceptingAppointments: data.accepting_appointments,
      timezone: data.timezone,
      createdAt: data.created_at,
      verificationStatus: data.verification_status,
      photoUrl,
      licenseUrl,
      degreeUrl,
    };
  },
);
