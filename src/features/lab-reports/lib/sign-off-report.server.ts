import "server-only";

import { randomUUID } from "node:crypto";

import {
  LAB_REPORTS_BUCKET,
  labReportErrorMessages,
  UNSTAMPABLE_REPORT_MESSAGE,
} from "@/features/lab-reports/lib/lab-reports";
import {
  stampLines,
  stampSignOff,
  UnstampableReportError,
} from "@/features/lab-reports/lib/stamp-report.server";
import { getOwnSigner } from "@/features/lab-staff/data/lab-staff";
import type { LabMember } from "@/features/lab-staff/lib/lab-member.server";
import { databaseErrorState } from "@/lib/database-errors";
import { formError, type FormState } from "@/lib/form-state";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type PendingReport = {
  booking_id: string;
  storage_path: string;
  lab_bookings: { timezone: string };
};

// Signs off a report waiting in the signer's lab (LAB-17): stamps their details
// on a copy of the upload, stores it beside the original, and has
// sign_off_lab_report release it. The caller has checked the member may sign.
// The report row is read with the signer's own session first, so the secret
// key only touches a file their lab owns.
export async function signOffReport(
  member: LabMember,
  reportId: string,
): Promise<FormState> {
  const supabase = await createClient();
  const { data: report, error } = await supabase
    .from("lab_reports")
    .select("booking_id, storage_path, lab_bookings (timezone)")
    .eq("id", reportId)
    .eq("lab_id", member.labId)
    .is("replaced_at", null)
    .is("released_at", null)
    .maybeSingle<PendingReport>();
  if (error) throw new Error(`lab_reports: ${error.message}`);
  if (!report) {
    return formError(
      labReportErrorMessages.report_not_pending,
      "report_not_pending",
    );
  }

  const signer = await getOwnSigner(member.user.id);
  if (!signer) {
    return formError(
      labReportErrorMessages.signer_details_missing,
      "signer_details_missing",
    );
  }

  const admin = createAdminClient();
  const bucket = admin.storage.from(LAB_REPORTS_BUCKET);
  const { data: file, error: downloadError } = await bucket.download(
    report.storage_path,
  );
  if (downloadError) {
    throw new Error(`${LAB_REPORTS_BUCKET}: ${downloadError.message}`);
  }

  let stamped: Uint8Array;
  try {
    stamped = await stampSignOff(
      new Uint8Array(await file.arrayBuffer()),
      stampLines(signer, new Date(), report.lab_bookings.timezone),
    );
  } catch (stampError) {
    if (stampError instanceof UnstampableReportError) {
      return formError(UNSTAMPABLE_REPORT_MESSAGE, "unstampable");
    }
    throw stampError;
  }

  const path = `${member.labId}/${report.booking_id}/${randomUUID()}.pdf`;
  const { error: uploadError } = await bucket.upload(path, stamped, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (uploadError) {
    throw new Error(`${LAB_REPORTS_BUCKET}: ${uploadError.message}`);
  }
  const discard = () => bucket.remove([path]);

  const { error: checkError } = await admin.rpc("mark_upload_checked", {
    p_bucket: LAB_REPORTS_BUCKET,
    p_path: path,
    p_owner_id: member.labId,
  });
  if (checkError) {
    await discard();
    return databaseErrorState(checkError, {}, "Recording a signed report");
  }

  const { error: signError } = await supabase.rpc("sign_off_lab_report", {
    p_report_id: reportId,
    p_signed_path: path,
    // What was stamped: the database refuses if the admin has changed them.
    p_signer_name: signer.name,
    p_signer_title: signer.title,
  });
  if (signError) {
    // Only when the database refused it: a lost response may follow a commit,
    // and then this file is the patient's report.
    if (signError.code) await discard();
    return databaseErrorState(
      signError,
      labReportErrorMessages,
      "Signing off a lab report",
    );
  }

  return {
    status: "success",
    message: "Signed off. The patient can open it now.",
  };
}
