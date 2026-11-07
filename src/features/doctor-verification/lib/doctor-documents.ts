import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  documentRules,
  DOCUMENTS_BUCKET,
  type DocumentKind,
} from "@/features/doctor-verification/lib/document-rules";
import { MB } from "@/lib/uploads/file-size";
import { createSignedUpload } from "@/lib/uploads/signed-upload.server";
import { verifyUpload } from "@/lib/uploads/verify-upload.server";

export const DOCUMENT_LINK_SECONDS = 5 * 60;

// Every upload gets a new path (see createSignedUpload).
export async function createDocumentUpload(
  admin: SupabaseClient,
  doctorId: string,
  kind: DocumentKind,
  type: string,
) {
  const extension = documentRules[kind].types[type];
  const path = `${doctorId}/${kind}-${randomUUID()}.${extension}`;
  return { kind, ...(await createSignedUpload(admin, DOCUMENTS_BUCKET, path)) };
}

// The browser did the upload, so check what actually arrived.
export async function isAcceptableUpload(
  admin: SupabaseClient,
  doctorId: string,
  kind: DocumentKind,
  path: string,
) {
  if (!path.startsWith(`${doctorId}/${kind}-`)) return false;

  const { maxMb, types } = documentRules[kind];
  return verifyUpload(admin, DOCUMENTS_BUCKET, path, {
    maxBytes: maxMb * MB,
    types,
  });
}
