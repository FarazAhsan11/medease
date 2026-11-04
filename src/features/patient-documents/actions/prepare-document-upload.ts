"use server";

import { createIncomingUpload } from "@/features/patient-documents/lib/patient-documents.server";
import {
  requestedUploadSchema,
  type PreparedUploadState,
} from "@/features/patient-documents/schemas/patient-document";
import { requireRole } from "@/lib/auth/session";
import { withFormErrors } from "@/lib/form-action.server";
import { formError } from "@/lib/form-state";
import {
  isRateLimited,
  RATE_LIMITED_MESSAGE,
  rateLimits,
} from "@/lib/rate-limit.server";
import { createAdminClient } from "@/lib/supabase/admin";

// Hands the browser a signed link to upload one file into the patient's own
// incoming/ folder.
export const prepareDocumentUpload = withFormErrors<
  PreparedUploadState,
  unknown
>(async (_previousState, input) => {
  const parsed = requestedUploadSchema.safeParse(input);
  if (!parsed.success) {
    return formError(
      "Choose a PDF, JPG or PNG file of 10 MB or less.",
      "validation_failed",
    );
  }

  const user = await requireRole("patient");
  if (await isRateLimited(rateLimits.uploadUser, user.id)) {
    return formError(RATE_LIMITED_MESSAGE, "rate_limited");
  }

  const upload = await createIncomingUpload(
    createAdminClient(),
    user.id,
    parsed.data.type,
  );
  return { status: "success", upload };
});
