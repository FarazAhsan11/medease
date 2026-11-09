import "server-only";

import {
  toLabReportSummary,
  type LabReportSummaryRow,
} from "@/features/lab-reports/lib/lab-report-summary";
import { createClient } from "@/lib/supabase/server";

// Row level security limits rows to the signed-in patient or lab, with their
// second factor; the filters keep each query on its index.

const SUMMARY_COLUMNS = `id, created_at,
  lab_bookings (lab_name, timezone, care_recipient_name, care_recipient_relation,
    lab_booking_items (name))`;

export const PUBLISHED_REPORTS_SHOWN = 20;

// The file's path, if the signed-in user may read this report.
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

// Current reports, newest first: the patient's for their records, or the
// lab's most recent.
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
    .order("created_at", { ascending: false });
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
