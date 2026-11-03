import "server-only";

import {
  toVisitSummary,
  type VisitSummary,
  type VisitSummaryRow,
} from "@/features/visit-summaries/lib/visit-summaries";
import { createClient } from "@/lib/supabase/server";

// Read through row level security: patients and doctors see only their own.
export async function getVisitSummaries(
  appointmentIds: string[],
): Promise<Record<string, VisitSummary>> {
  if (appointmentIds.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visit_summaries")
    .select("appointment_id, diagnosis, advice, follow_up_on, updated_at")
    .in("appointment_id", appointmentIds)
    .returns<VisitSummaryRow[]>();

  if (error) throw new Error(`visit_summaries: ${error.message}`);
  return Object.fromEntries(
    data.map((row) => [row.appointment_id, toVisitSummary(row)]),
  );
}
