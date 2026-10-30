"use server";

import { refresh } from "next/cache";

import { getDoctorVerification } from "@/features/doctor-verification/data/verification";
import { DOCUMENTS_BUCKET } from "@/features/doctor-verification/lib/document-rules";
import { isAcceptableUpload } from "@/features/doctor-verification/lib/doctor-documents";
import { isOpenForReview } from "@/features/doctor-verification/lib/verification";
import { uploadedDocumentsSchema } from "@/features/doctor-verification/schemas/verification";
import { getSessionUser } from "@/lib/auth/session";
import { databaseErrorState } from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, type FormState } from "@/lib/form-state";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const CLOSED_MESSAGE =
  "Your documents have been reviewed, so they can't be changed here. Please contact support.";

// Runs after the browser has uploaded the files: checks them, records them
// through save_verification_documents, and removes any files they replace.
export const saveVerificationDocuments = withFormErrors<FormState, unknown>(
  async (_previousState, input) => {
    const parsed = uploadedDocumentsSchema.safeParse(input);
    if (!parsed.success) {
      return formError("We couldn't save your documents. Please try again.");
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
      return formError(CLOSED_MESSAGE, "verification_closed");
    }

    const admin = createAdminClient();
    const checks = await Promise.all(
      parsed.data.map(({ kind, path }) =>
        isAcceptableUpload(admin, user.id, kind, path),
      ),
    );
    if (!checks.every(Boolean)) {
      return formError(
        "One of your files didn't upload correctly. Please try again.",
        "invalid_upload",
      );
    }

    const pathOf = (kind: string) =>
      parsed.data.find((document) => document.kind === kind)?.path ?? null;

    const supabase = await createClient();
    const { error } = await supabase.rpc("save_verification_documents", {
      p_photo_path: pathOf("photo"),
      p_license_path: pathOf("license"),
      p_degree_path: pathOf("degree"),
    });
    if (error) {
      return databaseErrorState(
        error,
        { verification_closed: CLOSED_MESSAGE },
        "Saving verification documents",
      );
    }

    const replaced = parsed.data.flatMap(
      ({ kind }) => verification.paths[kind] ?? [],
    );
    if (replaced.length > 0) {
      await admin.storage.from(DOCUMENTS_BUCKET).remove(replaced);
    }

    refresh();
    return { status: "success", message: "Documents saved." };
  },
);
