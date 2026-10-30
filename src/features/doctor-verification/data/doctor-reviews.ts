import "server-only";

import { cache } from "react";
import { z } from "zod";

import { DOCUMENTS_BUCKET } from "@/features/doctor-verification/lib/document-rules";
import { DOCUMENT_LINK_SECONDS } from "@/features/doctor-verification/lib/doctor-documents";
import type {
  DoctorDocuments,
  VerificationStatus,
} from "@/features/doctor-verification/lib/verification";
import { createClient } from "@/lib/supabase/server";

export type DoctorReview = {
  id: string;
  name: string;
  email: string;
  emailConfirmed: boolean;
  phone: string;
  age: number;
  gender: string;
  specialization: string;
  licenseNumber: string;
  clinicAddress: string;
  city: string | null;
  status: VerificationStatus;
  note: string | null;
  verifiedAt: string | null;
  createdAt: string;
  documents: DoctorDocuments;
  paths: {
    photo: string | null;
    license: string | null;
    degree: string | null;
  };
};

type ReviewRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  email_confirmed: boolean;
  phone: string;
  age: number;
  gender: string;
  specialization: string;
  license_number: string;
  clinic_address: string;
  city: string | null;
  photo_path: string | null;
  license_document_path: string | null;
  degree_path: string | null;
  verification_status: VerificationStatus;
  verification_note: string | null;
  verified_at: string | null;
  created_at: string;
};

function toReview(row: ReviewRow): DoctorReview {
  return {
    id: row.id,
    name: `Dr. ${row.first_name} ${row.last_name}`,
    email: row.email,
    emailConfirmed: row.email_confirmed,
    phone: row.phone,
    age: row.age,
    gender: row.gender,
    specialization: row.specialization,
    licenseNumber: row.license_number,
    clinicAddress: row.clinic_address,
    city: row.city,
    status: row.verification_status,
    note: row.verification_note,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
    documents: {
      photo: Boolean(row.photo_path),
      license: Boolean(row.license_document_path),
      degree: Boolean(row.degree_path),
    },
    paths: {
      photo: row.photo_path,
      license: row.license_document_path,
      degree: row.degree_path,
    },
  };
}

// admin_doctor_reviews refuses anyone but an admin who passed their second
// factor, so these use the caller's own session, never the secret key.
export async function listDoctorReviews(): Promise<DoctorReview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_doctor_reviews");

  if (error) throw new Error(`admin_doctor_reviews: ${error.message}`);
  return (data as ReviewRow[]).map(toReview);
}

export const getDoctorReview = cache(async (doctorId: string) => {
  if (!z.uuid().safeParse(doctorId).success) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_doctor_reviews", {
    p_doctor_id: doctorId,
  });

  if (error) throw new Error(`admin_doctor_reviews: ${error.message}`);

  const [row] = data as ReviewRow[];
  return row ? toReview(row) : null;
});

// Short-lived links, created for the admin's own session (storage policy).
export async function getDocumentLinks(review: DoctorReview) {
  const supabase = await createClient();
  const documents = supabase.storage.from(DOCUMENTS_BUCKET);
  const sign = async (path: string | null) =>
    path
      ? ((await documents.createSignedUrl(path, DOCUMENT_LINK_SECONDS)).data
          ?.signedUrl ?? null)
      : null;

  const [photo, license, degree] = await Promise.all([
    sign(review.paths.photo),
    sign(review.paths.license),
    sign(review.paths.degree),
  ]);

  return { photo, license, degree };
}
