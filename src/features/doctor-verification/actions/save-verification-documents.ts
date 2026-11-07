"use server";

import { refresh } from "next/cache";

import { getDoctorVerification } from "@/features/doctor-verification/data/verification";
import { DOCUMENTS_BUCKET } from "@/features/doctor-verification/lib/document-rules";
import { isAcceptableUpload } from "@/features/doctor-verification/lib/doctor-documents";
import { isOpenForReview } from "@/lib/verification";
import { uploadedDocumentsSchema } from "@/features/doctor-verification/schemas/verification";
import { getSessionUser } from "@/lib/auth/session";
import { databaseErrorState } from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, type FormState } from "@/lib/form-state";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const UPLOAD_FAILED_MESSAGE =
  "One of your files didn't upload correctly. Please try again.";

const CLOSED_MESSAGE =
  "Your documents have been reviewed, so they can't be changed here. Please contact support.";

// Runs after the browser has uploaded the files: checks each one and records
// it as checked, saves them through save_verification_documents (which takes
// only checked files), and removes any files they replace. New files are
// deleted if the save fails.
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
    // Only ever delete inside the doctor's own folder.
    const discardUploads = () =>
      admin.storage
        .from(DOCUMENTS_BUCKET)
        .remove(
          parsed.data
            .map(({ path }) => path)
            .filter((path) => path.startsWith(`${user.id}/`)),
        );

    const checks = await Promise.all(
      parsed.data.map(({ kind, path }) =>
        isAcceptableUpload(admin, user.id, kind, path),
      ),
    );
    if (!checks.every(Boolean)) {
      await discardUploads();
      return formError(UPLOAD_FAILED_MESSAGE, "invalid_upload");
    }

    for (const { path } of parsed.data) {
      const { error } = await admin.rpc("mark_upload_checked", {
        p_bucket: DOCUMENTS_BUCKET,
        p_path: path,
        p_owner_id: user.id,
      });
      if (error) {
        await discardUploads();
        return databaseErrorState(error, {}, "Recording a checked document");
      }
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
      await discardUploads();
      return databaseErrorState(
        error,
        {
          verification_closed: CLOSED_MESSAGE,
          invalid_path: UPLOAD_FAILED_MESSAGE,
          upload_not_checked: UPLOAD_FAILED_MESSAGE,
        },
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
