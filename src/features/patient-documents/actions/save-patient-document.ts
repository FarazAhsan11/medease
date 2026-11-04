"use server";

import { refresh } from "next/cache";

import { documentErrorMessages } from "@/features/patient-documents/lib/patient-documents";
import {
  removeStoredDocument,
  storeIncomingUpload,
} from "@/features/patient-documents/lib/patient-documents.server";
import { uploadedDocumentSchema } from "@/features/patient-documents/schemas/patient-document";
import { requireRole } from "@/lib/auth/session";
import { databaseErrorState } from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, validationError, type FormState } from "@/lib/form-state";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Runs after the browser has uploaded the file: checks it, moves it out of
// incoming/ and records it through add_patient_document.
export const savePatientDocument = withFormErrors<FormState, unknown>(
  async (_previousState, input) => {
    const parsed = uploadedDocumentSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);

    const user = await requireRole("patient");
    const admin = createAdminClient();
    const storedPath = await storeIncomingUpload(
      admin,
      user.id,
      parsed.data.path,
    );
    if (!storedPath) {
      return formError(
        "That file isn't a PDF, JPG or PNG we can open, or it didn't upload completely. Please try another file.",
        "invalid_upload",
      );
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("add_patient_document", {
      p_path: storedPath,
      p_kind: parsed.data.kind,
      p_title: parsed.data.title,
      p_document_on: parsed.data.documentOn ?? null,
    });
    if (error) {
      await removeStoredDocument(admin, storedPath);
      return databaseErrorState(
        error,
        documentErrorMessages,
        "Saving a patient document",
      );
    }

    refresh();
    return { status: "success", message: "Document uploaded." };
  },
);
