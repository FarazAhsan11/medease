import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  LAB_REPORTS_BUCKET,
  MAX_REPORT_BYTES,
  reportFileTypes,
} from "@/features/lab-reports/lib/lab-reports";
import { createSignedUpload } from "@/lib/uploads/signed-upload.server";
import { verifyUpload } from "@/lib/uploads/verify-upload.server";

// Signed download links last a minute: long enough to open, too short to pass
// around.
export const REPORT_LINK_SECONDS = 60;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

// Exactly <lab id>/<booking id>/<uuid>.pdf, as publish_lab_report checks. Every
// storage call on a path the browser sent back goes through this first, so a
// crafted path (another folder, "..") never reaches Storage.
export function isReportPath(labId: string, bookingId: string, path: string) {
  return new RegExp(`^${labId}/${bookingId}/${UUID}[.]pdf$`).test(path);
}

// A new path every time (see createSignedUpload).
export async function createReportUpload(
  admin: SupabaseClient,
  labId: string,
  bookingId: string,
) {
  const path = `${labId}/${bookingId}/${randomUUID()}.pdf`;
  return createSignedUpload(admin, LAB_REPORTS_BUCKET, path);
}

// The browser did the upload, so check what actually arrived. A file that
// fails is deleted. The caller has checked the path (isReportPath).
export async function isAcceptableReport(admin: SupabaseClient, path: string) {
  return verifyUpload(admin, LAB_REPORTS_BUCKET, path, {
    maxBytes: MAX_REPORT_BYTES,
    types: reportFileTypes,
  });
}
