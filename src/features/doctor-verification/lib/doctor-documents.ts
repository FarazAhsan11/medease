import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  documentRules,
  DOCUMENTS_BUCKET,
  isAllowedFile,
  type DocumentKind,
} from "@/features/doctor-verification/lib/document-rules";

export const DOCUMENT_LINK_SECONDS = 5 * 60;

// Files go straight from the browser to Storage on a signed upload link, so
// they never pass through a Server Action (Vercel limits request bodies to
// 4.5 MB). Every upload gets a new path and no upsert: a path takes one file,
// so a leftover link can't swap a file after an admin has reviewed it.
export async function createDocumentUpload(
  admin: SupabaseClient,
  doctorId: string,
  kind: DocumentKind,
  type: string,
) {
  const extension = documentRules[kind].types[type];
  const path = `${doctorId}/${kind}-${randomUUID()}.${extension}`;
  const { data, error } = await admin.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUploadUrl(path);
  if (error) throw new Error(`${DOCUMENTS_BUCKET}: ${error.message}`);

  return { kind, path: data.path, token: data.token };
}

// The browser did the upload, so check what actually arrived.
export async function isAcceptableUpload(
  admin: SupabaseClient,
  doctorId: string,
  kind: DocumentKind,
  path: string,
) {
  if (!path.startsWith(`${doctorId}/${kind}-`)) return false;

  const { data, error } = await admin.storage.from(DOCUMENTS_BUCKET).info(path);
  if (error) return false;

  return isAllowedFile(kind, data.contentType ?? "", data.size ?? 0);
}
