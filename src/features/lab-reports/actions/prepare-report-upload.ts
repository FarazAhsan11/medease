"use server";

import { refresh } from "next/cache";

import { labReportErrorMessages } from "@/features/lab-reports/lib/lab-reports";
import { createReportUpload } from "@/features/lab-reports/lib/lab-reports.server";
import {
  requestedReportUploadSchema,
  type PreparedReportUploadState,
} from "@/features/lab-reports/schemas/lab-report";
import { requireLabMember } from "@/features/lab-staff/lib/lab-member.server";
import { withFormErrors } from "@/lib/form-action.server";
import { formError } from "@/lib/form-state";
import {
  isRateLimited,
  RATE_LIMITED_MESSAGE,
  rateLimits,
} from "@/lib/rate-limit.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Hands the browser a signed link to upload a report into the booking's own
// folder: only for the lab's own booking, while it's being processed.
export const prepareReportUpload = withFormErrors<
  PreparedReportUploadState,
  unknown
>(async (_previousState, input) => {
  const parsed = requestedReportUploadSchema.safeParse(input);
  if (!parsed.success) {
    return formError("Choose a PDF of 10 MB or less.", "validation_failed");
  }

  const { user, labId } = await requireLabMember("reports.publish");
  if (await isRateLimited(rateLimits.labReportUploadUser, user.id)) {
    return formError(RATE_LIMITED_MESSAGE, "rate_limited");
  }

  // Read with the lab's own session: row level security limits it to the
  // lab's bookings. publish_lab_report checks again.
  const { bookingId } = parsed.data;
  const supabase = await createClient();
  const { data: booking, error } = await supabase
    .from("lab_bookings")
    .select("status")
    .eq("id", bookingId)
    .maybeSingle();
  if (error) throw new Error(`lab_bookings: ${error.message}`);
  if (!booking) {
    return formError(
      labReportErrorMessages.booking_not_found,
      "booking_not_found",
    );
  }
  if (booking.status !== "processing") {
    refresh();
    return formError(labReportErrorMessages.status_changed, "status_changed");
  }

  const upload = await createReportUpload(
    createAdminClient(),
    labId,
    bookingId,
  );
  return { status: "success", upload };
});
