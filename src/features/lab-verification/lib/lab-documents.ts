import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  LAB_DOCUMENTS_BUCKET,
  licenseRule,
} from "@/features/lab-verification/lib/lab-verification";
import { MB } from "@/lib/uploads/file-size";
import { createSignedUpload } from "@/lib/uploads/signed-upload.server";
import { verifyUpload } from "@/lib/uploads/verify-upload.server";

export const LAB_DOCUMENT_LINK_SECONDS = 5 * 60;

// A new path every time (see createSignedUpload).
export async function createLicenseUpload(
  admin: SupabaseClient,
  labId: string,
  type: string,
) {
  const path = `${labId}/license-${randomUUID()}.${licenseRule.types[type]}`;
  return createSignedUpload(admin, LAB_DOCUMENTS_BUCKET, path);
}

// The browser did the upload, so check what actually arrived. A file that
// fails is deleted.
export async function isAcceptableLicense(
  admin: SupabaseClient,
  labId: string,
  path: string,
) {
  if (!path.startsWith(`${labId}/license-`)) return false;

  return verifyUpload(admin, LAB_DOCUMENTS_BUCKET, path, {
    maxBytes: licenseRule.maxMb * MB,
    types: licenseRule.types,
  });
}
