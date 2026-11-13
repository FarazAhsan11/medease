"use server";

import { refresh } from "next/cache";

import {
  LAB_REPORTS_BUCKET,
  labReportErrorMessages,
  REPORT_UPLOAD_FAILED_MESSAGE,
} from "@/features/lab-reports/lib/lab-reports";
import {
  isAcceptableReport,
  isReportPath,
} from "@/features/lab-reports/lib/lab-reports.server";
import { uploadedReportSchema } from "@/features/lab-reports/schemas/lab-report";
import { requireLabMember } from "@/features/lab-staff/lib/lab-member.server";
import { databaseErrorState } from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, type FormState } from "@/lib/form-state";
import {
  isRateLimited,
  RATE_LIMITED_MESSAGE,
  rateLimits,
} from "@/lib/rate-limit.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Runs after the browser has uploaded the report: checks the file, records it
// as checked, and publishes it through publish_lab_report, which files it and
// marks the booking report ready (telling the patient). A file that fails or
// isn't published is deleted.
export const publishLabReport = withFormErrors<FormState, unknown>(
  async (_previousState, input) => {
    const { user, labId } = await requireLabMember("reports.publish");
    const parsed = uploadedReportSchema.safeParse(input);
    if (!parsed.success) {
      return formError(REPORT_UPLOAD_FAILED_MESSAGE, "validation_failed");
    }

    const { bookingId, path } = parsed.data;
    // Only a path in this booking's folder in the lab's own space is touched.
    if (!isReportPath(labId, bookingId, path)) {
      return formError(REPORT_UPLOAD_FAILED_MESSAGE, "invalid_path");
    }
    const admin = createAdminClient();
    const discardUpload = () =>
      admin.storage.from(LAB_REPORTS_BUCKET).remove([path]);

    // Publishing is a status move, so it counts with the others.
    if (await isRateLimited(rateLimits.labBookingMoveUser, user.id)) {
      await discardUpload();
      return formError(RATE_LIMITED_MESSAGE, "rate_limited");
    }

    // isAcceptableReport deletes a file that fails its check.
    if (!(await isAcceptableReport(admin, path))) {
      return formError(REPORT_UPLOAD_FAILED_MESSAGE, "invalid_upload");
    }
    const { error: checkError } = await admin.rpc("mark_upload_checked", {
      p_bucket: LAB_REPORTS_BUCKET,
      p_path: path,
      p_owner_id: labId,
    });
    if (checkError) {
      await discardUpload();
      return databaseErrorState(checkError, {}, "Recording a checked report");
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("publish_lab_report", {
      p_booking_id: bookingId,
      p_path: path,
    });
    if (error) {
      // Only when the database refused it. A lost response (no code) may
      // follow a commit, and then the file is the patient's report.
      if (error.code) await discardUpload();
      // Someone else moved it: show where it is now.
      if (error.message === "status_changed") refresh();
      return databaseErrorState(
        error,
        labReportErrorMessages,
        "Publishing a lab report",
      );
    }

    refresh();
    return {
      status: "success",
      message: "Report published. The patient can open it now.",
    };
  },
);
