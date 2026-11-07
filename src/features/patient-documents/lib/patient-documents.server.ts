import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  documentFileTypes,
  MAX_DOCUMENT_BYTES,
  PATIENT_DOCUMENTS_BUCKET,
} from "@/features/patient-documents/lib/document-rules";
import { createSignedUpload } from "@/lib/uploads/signed-upload.server";
import { verifyUpload } from "@/lib/uploads/verify-upload.server";

export const DOCUMENT_LINK_SECONDS = 60;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

// The browser uploads into incoming/, on a signed link that takes one file at a
// new path. Only the server moves a file out of there, after checking it, and
// the database records only files outside incoming/.
export async function createIncomingUpload(
  admin: SupabaseClient,
  patientId: string,
  type: string,
) {
  const path = `${patientId}/incoming/${randomUUID()}.${documentFileTypes[type]}`;
  return createSignedUpload(admin, PATIENT_DOCUMENTS_BUCKET, path);
}

// Checks what the browser uploaded and moves it into place. Returns the stored
// path, or null when the file is refused (and then deleted).
export async function storeIncomingUpload(
  admin: SupabaseClient,
  patientId: string,
  incomingPath: string,
): Promise<string | null> {
  const pattern = new RegExp(`^${patientId}/incoming/${UUID}\\.(pdf|jpg|png)$`);
  if (!pattern.test(incomingPath)) return null;

  const acceptable = await verifyUpload(
    admin,
    PATIENT_DOCUMENTS_BUCKET,
    incomingPath,
    { maxBytes: MAX_DOCUMENT_BYTES, types: documentFileTypes },
  );
  if (!acceptable) return null;

  const storage = admin.storage.from(PATIENT_DOCUMENTS_BUCKET);
  const storedPath = incomingPath.replace("/incoming/", "/");
  const { error } = await storage.move(incomingPath, storedPath);
  if (error) {
    await storage.remove([incomingPath]);
    return null;
  }
  return storedPath;
}

export async function removeStoredDocument(
  admin: SupabaseClient,
  path: string,
) {
  await admin.storage.from(PATIENT_DOCUMENTS_BUCKET).remove([path]);
}
