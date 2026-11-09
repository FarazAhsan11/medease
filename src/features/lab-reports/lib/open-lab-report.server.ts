import "server-only";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getReadableReportPath } from "@/features/lab-reports/data/lab-reports";
import { LAB_REPORTS_BUCKET } from "@/features/lab-reports/lib/lab-reports";
import { REPORT_LINK_SECONDS } from "@/features/lab-reports/lib/lab-reports.server";
import { createAdminClient } from "@/lib/supabase/admin";

// The report row is read with the caller's own session, so row level security
// (the patient or the lab, with a second factor) is the permission check; only
// then does the secret key sign a link that lasts a minute. The browser opens
// the PDF in its own viewer.
export async function openLabReport(id: string): Promise<never> {
  const reportId = z.uuid().safeParse(id);
  const path = reportId.success
    ? await getReadableReportPath(reportId.data)
    : null;
  if (!path) notFound();

  const { data, error } = await createAdminClient()
    .storage.from(LAB_REPORTS_BUCKET)
    .createSignedUrl(path, REPORT_LINK_SECONDS);
  if (error) throw new Error(`${LAB_REPORTS_BUCKET}: ${error.message}`);

  redirect(data.signedUrl);
}
