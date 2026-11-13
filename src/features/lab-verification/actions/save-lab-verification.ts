"use server";

import { refresh } from "next/cache";

import { findLabMember } from "@/features/lab-staff/lib/lab-member.server";
import { getLabVerification } from "@/features/lab-verification/data/lab-verification";
import { isAcceptableLicense } from "@/features/lab-verification/lib/lab-documents";
import {
  CLOSED_MESSAGE,
  LAB_DOCUMENTS_BUCKET,
} from "@/features/lab-verification/lib/lab-verification";
import { labVerificationSchema } from "@/features/lab-verification/schemas/lab-verification";
import {
  databaseErrorState,
  SECOND_FACTOR_MESSAGE,
} from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import {
  isRateLimited,
  RATE_LIMITED_MESSAGE,
  rateLimits,
} from "@/lib/rate-limit.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isOpenForReview } from "@/lib/verification";

const UPLOAD_FAILED_MESSAGE =
  "Your licence didn't upload correctly. Please try again.";

// Runs after the browser has uploaded any new licence: checks the file and
// records it as checked, saves everything through save_lab_verification
// (which puts the lab back in the queue and takes only checked files), and
// removes the licence it replaced. A new file is deleted if the save fails.
export const saveLabVerification = withFormErrors<FormState, unknown>(
  async (_previousState, input) => {
    // Only the admin, whose account id is the lab's (save_lab_verification
    // refuses staff too); this says why.
    const member = await findLabMember("profile");
    if (!member) {
      return formError(
        "Only the lab admin can send verification details.",
        "not_lab",
      );
    }
    const { user } = member;

    const admin = createAdminClient();
    const parsed = labVerificationSchema.safeParse(input);
    // Read before validation, so even a refused save removes the upload, but
    // only ever inside the lab's own folder.
    const uploaded = (input as { licensePath?: unknown } | null)?.licensePath;
    const discardUpload = async () => {
      if (
        typeof uploaded === "string" &&
        uploaded.startsWith(`${user.id}/license-`)
      ) {
        await admin.storage.from(LAB_DOCUMENTS_BUCKET).remove([uploaded]);
      }
    };
    const fail = async (state: FormState) => {
      await discardUpload();
      return state;
    };

    if (!parsed.success) return fail(validationError(parsed.error));
    if (user.assuranceLevel !== "aal2") {
      return fail(formError(SECOND_FACTOR_MESSAGE, "second_factor_required"));
    }
    if (await isRateLimited(rateLimits.verificationUser, user.id)) {
      return fail(formError(RATE_LIMITED_MESSAGE, "rate_limited"));
    }

    const verification = await getLabVerification(user.id);
    if (!verification || !isOpenForReview(verification.status)) {
      return fail(formError(CLOSED_MESSAGE, "verification_closed"));
    }

    const { registrationNumber, licensingAuthority, address, licensePath } =
      parsed.data;
    if (licensePath) {
      // isAcceptableLicense deletes a file that fails its check.
      if (!(await isAcceptableLicense(admin, user.id, licensePath))) {
        return fail(formError(UPLOAD_FAILED_MESSAGE, "invalid_upload"));
      }
      const { error } = await admin.rpc("mark_upload_checked", {
        p_bucket: LAB_DOCUMENTS_BUCKET,
        p_path: licensePath,
        p_owner_id: user.id,
      });
      if (error) {
        await discardUpload();
        return databaseErrorState(error, {}, "Recording a checked licence");
      }
    }

    const supabase = await createClient();
    const { data: replaced, error } = await supabase.rpc(
      "save_lab_verification",
      {
        p_registration_number: registrationNumber,
        p_licensing_authority: licensingAuthority,
        p_address: address,
        p_license_path: licensePath ?? null,
      },
    );
    if (error) {
      await discardUpload();
      return databaseErrorState(
        error,
        {
          verification_closed: CLOSED_MESSAGE,
          invalid_path: UPLOAD_FAILED_MESSAGE,
          upload_not_checked: UPLOAD_FAILED_MESSAGE,
        },
        "Saving lab verification",
      );
    }

    if (typeof replaced === "string") {
      await admin.storage.from(LAB_DOCUMENTS_BUCKET).remove([replaced]);
    }

    refresh();
    return {
      status: "success",
      message: "Details sent. Our team will review them.",
    };
  },
);
