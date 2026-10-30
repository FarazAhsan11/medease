import "server-only";

import { cache } from "react";

import type { DocumentKind } from "@/features/doctor-verification/lib/document-rules";
import type {
  DoctorDocuments,
  VerificationStatus,
} from "@/features/doctor-verification/lib/verification";
import { createClient } from "@/lib/supabase/server";

export type DoctorVerification = {
  status: VerificationStatus;
  note: string | null;
  documents: DoctorDocuments;
  paths: Record<DocumentKind, string | null>;
  hasHours: boolean;
};

type VerificationRow = {
  verification_status: VerificationStatus;
  verification_note: string | null;
  photo_path: string | null;
  license_document_path: string | null;
  degree_path: string | null;
};

// The signed-in doctor's own status (row level security allows only that).
export const getDoctorVerification = cache(
  async (doctorId: string): Promise<DoctorVerification | null> => {
    const supabase = await createClient();
    const [profile, hours] = await Promise.all([
      supabase
        .from("doctor_profiles")
        .select(
          "verification_status, verification_note, photo_path, license_document_path, degree_path",
        )
        .eq("id", doctorId)
        .maybeSingle<VerificationRow>(),
      supabase
        .from("doctor_availability")
        .select("id", { count: "exact", head: true })
        .eq("doctor_id", doctorId),
    ]);

    if (profile.error) {
      throw new Error(`doctor_profiles: ${profile.error.message}`);
    }
    if (hours.error) {
      throw new Error(`doctor_availability: ${hours.error.message}`);
    }
    if (!profile.data) return null;

    return {
      status: profile.data.verification_status,
      note: profile.data.verification_note,
      documents: {
        photo: Boolean(profile.data.photo_path),
        license: Boolean(profile.data.license_document_path),
        degree: Boolean(profile.data.degree_path),
      },
      paths: {
        photo: profile.data.photo_path,
        license: profile.data.license_document_path,
        degree: profile.data.degree_path,
      },
      hasHours: (hours.count ?? 0) > 0,
    };
  },
);
