import "server-only";

import { cache } from "react";

import type { LicensingAuthority } from "@/features/lab-verification/lib/lab-verification";
import { createClient } from "@/lib/supabase/server";
import type { VerificationStatus } from "@/lib/verification";

export type LabVerification = {
  status: VerificationStatus;
  note: string | null;
  registrationNumber: string;
  licensingAuthority: LicensingAuthority | null;
  address: string;
  hasLicense: boolean;
};

type LabVerificationRow = {
  verification_status: VerificationStatus;
  verification_note: string | null;
  registration_number: string;
  licensing_authority: LicensingAuthority | null;
  address: string;
  license_document_path: string | null;
};

// The signed-in lab's own status (row level security allows only that).
export const getLabVerification = cache(
  async (labId: string): Promise<LabVerification | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lab_profiles")
      .select(
        "verification_status, verification_note, registration_number, licensing_authority, address, license_document_path",
      )
      .eq("id", labId)
      .maybeSingle<LabVerificationRow>();

    if (error) throw new Error(`lab_profiles: ${error.message}`);
    if (!data) return null;

    return {
      status: data.verification_status,
      note: data.verification_note,
      registrationNumber: data.registration_number,
      licensingAuthority: data.licensing_authority,
      address: data.address,
      hasLicense: Boolean(data.license_document_path),
    };
  },
);
