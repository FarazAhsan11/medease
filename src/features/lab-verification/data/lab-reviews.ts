import "server-only";

import { cache } from "react";
import { z } from "zod";

import { LAB_DOCUMENT_LINK_SECONDS } from "@/features/lab-verification/lib/lab-documents";
import {
  LAB_DOCUMENTS_BUCKET,
  type LicensingAuthority,
} from "@/features/lab-verification/lib/lab-verification";
import { createClient } from "@/lib/supabase/server";
import type { VerificationStatus } from "@/lib/verification";

export type LabReview = {
  id: string;
  name: string;
  email: string;
  emailConfirmed: boolean;
  contactPerson: string;
  phone: string;
  address: string;
  services: string[];
  registrationNumber: string;
  licensingAuthority: LicensingAuthority | null;
  licensePath: string | null;
  status: VerificationStatus;
  note: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
};

type LabReviewRow = {
  id: string;
  lab_name: string;
  email: string;
  email_confirmed: boolean;
  contact_person: string;
  phone: string;
  address: string;
  services: string[];
  registration_number: string;
  licensing_authority: LicensingAuthority | null;
  license_document_path: string | null;
  verification_status: VerificationStatus;
  verification_note: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  created_at: string;
};

const toReview = (row: LabReviewRow): LabReview => ({
  id: row.id,
  name: row.lab_name,
  email: row.email,
  emailConfirmed: row.email_confirmed,
  contactPerson: row.contact_person,
  phone: row.phone,
  address: row.address,
  services: row.services,
  registrationNumber: row.registration_number,
  licensingAuthority: row.licensing_authority,
  licensePath: row.license_document_path,
  status: row.verification_status,
  note: row.verification_note,
  submittedAt: row.submitted_at,
  verifiedAt: row.verified_at,
  createdAt: row.created_at,
});

// The licence and authority are what an admin checks, so both are needed.
export const isReadyForApproval = (review: LabReview) =>
  review.emailConfirmed &&
  Boolean(review.licensePath) &&
  review.licensingAuthority !== null;

// admin_lab_reviews refuses anyone but an admin who passed their second
// factor, so these use the caller's own session, never the secret key.
export async function listLabReviews(): Promise<LabReview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_lab_reviews");

  if (error) throw new Error(`admin_lab_reviews: ${error.message}`);
  return (data as LabReviewRow[]).map(toReview);
}

export const getLabReview = cache(async (labId: string) => {
  if (!z.uuid().safeParse(labId).success) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_lab_reviews", {
    p_lab_id: labId,
  });

  if (error) throw new Error(`admin_lab_reviews: ${error.message}`);

  const [row] = data as LabReviewRow[];
  return row ? toReview(row) : null;
});

// A short-lived link, created for the admin's own session (storage policy).
export async function getLicenseLink(review: LabReview) {
  if (!review.licensePath) return null;

  const supabase = await createClient();
  const { data } = await supabase.storage
    .from(LAB_DOCUMENTS_BUCKET)
    .createSignedUrl(review.licensePath, LAB_DOCUMENT_LINK_SECONDS);

  return data?.signedUrl ?? null;
}
