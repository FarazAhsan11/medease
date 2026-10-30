"use server";

import { getDoctorVerification } from "@/features/doctor-verification/data/verification";
import { createDocumentUpload } from "@/features/doctor-verification/lib/doctor-documents";
import { isOpenForReview } from "@/features/doctor-verification/lib/verification";
import {
  requestedUploadsSchema,
  type PreparedUploadsState,
} from "@/features/doctor-verification/schemas/verification";
import { getSessionUser } from "@/lib/auth/session";
import { withFormErrors } from "@/lib/form-action.server";
import { formError } from "@/lib/form-state";
import { createAdminClient } from "@/lib/supabase/admin";

// Hands the browser one signed upload link per file. Only the doctor
// themself, and only while their documents can still change.
export const prepareDocumentUploads = withFormErrors<
  PreparedUploadsState,
  unknown
>(async (_previousState, input) => {
  const parsed = requestedUploadsSchema.safeParse(input);
  if (!parsed.success) {
    return formError("Check your files and try again.", "validation_failed");
  }

  const user = await getSessionUser();
  if (user?.role !== "doctor") {
    return formError(
      "Only doctors can upload verification documents.",
      "not_doctor",
    );
  }

  const verification = await getDoctorVerification(user.id);
  if (!verification || !isOpenForReview(verification.status)) {
    return formError(
      "Your documents have been reviewed, so they can't be changed here. Please contact support.",
      "verification_closed",
    );
  }

  const admin = createAdminClient();
  const uploads = await Promise.all(
    parsed.data.map(({ kind, type }) =>
      createDocumentUpload(admin, user.id, kind, type),
    ),
  );

  return { status: "success", uploads };
});
