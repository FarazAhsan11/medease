import "server-only";

import {
  toLabReportSummary,
  type LabReportSummaryRow,
} from "@/features/lab-reports/lib/lab-report-summary";
import { createClient } from "@/lib/supabase/server";

// Row level security limits rows to the signed-in patient, lab or ordering
// doctor, with their second factor; the filters keep each query on its index.

const SUMMARY_COLUMNS = `id, booking_id, created_at, released_at, signer_name, signer_title,
  lab_bookings (lab_name, timezone, care_recipient_name, care_recipient_relation,
    lab_booking_items (name))`;

export const PUBLISHED_REPORTS_SHOWN = 20;
export const REPORTS_TO_SIGN_SHOWN = 50;

// The file's path, if the signed-in user may read this report: the patient and
// the ordering doctor once it's released, the lab at any time.
export async function getReadableReportPath(
  reportId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lab_reports")
    .select("storage_path")
    .eq("id", reportId)
    .maybeSingle<{ storage_path: string }>();

  if (error) throw new Error(`lab_reports: ${error.message}`);
  return data?.storage_path ?? null;
}

// Current released reports, latest first: the patient's for their records, or
// the lab's most recent.
async function listReports(
  column: "patient_id" | "lab_id",
  userId: string,
  limit?: number,
) {
  const supabase = await createClient();
  let query = supabase
    .from("lab_reports")
    .select(SUMMARY_COLUMNS)
    .eq(column, userId)
    .is("replaced_at", null)
    .not("released_at", "is", null)
    .order("released_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query.returns<LabReportSummaryRow[]>();

  if (error) throw new Error(`lab_reports: ${error.message}`);
  return data.map(toLabReportSummary);
}

export function listPatientLabReports(patientId: string) {
  return listReports("patient_id", patientId);
}

export function listPublishedLabReports(labId: string) {
  return listReports("lab_id", labId, PUBLISHED_REPORTS_SHOWN);
}

// The lab's reports waiting for sign-off, longest waiting first (LAB-17).
export async function listReportsToSignOff(labId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lab_reports")
    .select(SUMMARY_COLUMNS)
    .eq("lab_id", labId)
    .is("replaced_at", null)
    .is("released_at", null)
    .order("created_at", { ascending: true })
    .limit(REPORTS_TO_SIGN_SHOWN + 1)
    .returns<LabReportSummaryRow[]>();

  if (error) throw new Error(`lab_reports: ${error.message}`);
  return {
    reports: data.slice(0, REPORTS_TO_SIGN_SHOWN).map(toLabReportSummary),
    more: data.length > REPORTS_TO_SIGN_SHOWN,
  };
}
