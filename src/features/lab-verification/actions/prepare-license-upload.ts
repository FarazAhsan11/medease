"use server";

import { getLabVerification } from "@/features/lab-verification/data/lab-verification";
import { createLicenseUpload } from "@/features/lab-verification/lib/lab-documents";
import { CLOSED_MESSAGE } from "@/features/lab-verification/lib/lab-verification";
import {
  requestedLicenseUploadSchema,
  type PreparedLicenseUploadState,
} from "@/features/lab-verification/schemas/lab-verification";
import { findLabMember } from "@/features/lab-staff/lib/lab-member.server";
import { SECOND_FACTOR_MESSAGE } from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { formError } from "@/lib/form-state";
import {
  isRateLimited,
  RATE_LIMITED_MESSAGE,
  rateLimits,
} from "@/lib/rate-limit.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOpenForReview } from "@/lib/verification";

// Hands the browser a signed upload link for the licence. Only the lab
// itself, and only while its details can still change.
export const prepareLicenseUpload = withFormErrors<
  PreparedLicenseUploadState,
  unknown
>(async (_previousState, input) => {
  const parsed = requestedLicenseUploadSchema.safeParse(input);
  if (!parsed.success) {
    return formError("Check your file and try again.", "validation_failed");
  }

  // Only the admin, whose account id is the lab's (save_lab_verification
  // refuses staff too); this says why.
  const member = await findLabMember("profile");
  if (!member) {
    return formError("Only the lab admin can upload a licence.", "not_lab");
  }
  const { user } = member;
  if (user.assuranceLevel !== "aal2") {
    return formError(SECOND_FACTOR_MESSAGE, "second_factor_required");
  }

  if (await isRateLimited(rateLimits.uploadUser, user.id)) {
    return formError(RATE_LIMITED_MESSAGE, "rate_limited");
  }

  const verification = await getLabVerification(user.id);
  if (!verification || !isOpenForReview(verification.status)) {
    return formError(CLOSED_MESSAGE, "verification_closed");
  }

  const upload = await createLicenseUpload(
    createAdminClient(),
    user.id,
    parsed.data.type,
  );
  return { status: "success", upload };
});
