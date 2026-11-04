"use server";

import { refresh } from "next/cache";

import { documentErrorMessages } from "@/features/patient-documents/lib/patient-documents";
import { removeStoredDocument } from "@/features/patient-documents/lib/patient-documents.server";
import { deleteDocumentSchema } from "@/features/patient-documents/schemas/patient-document";
import { requireRole } from "@/lib/auth/session";
import { databaseErrorState } from "@/lib/database-errors";
import { withFormErrors } from "@/lib/form-action.server";
import { formError, type FormState } from "@/lib/form-state";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// The database removes the row and hands back the file's path, so only the
// patient's own files can be removed from Storage.
export const deletePatientDocument = withFormErrors(
  async (_previousState: FormState, formData: FormData) => {
    const parsed = deleteDocumentSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return formError("That document no longer exists.");

    await requireRole("patient");
    const supabase = await createClient();
    const { data: path, error } = await supabase.rpc(
      "delete_patient_document",
      { p_document_id: parsed.data.documentId },
    );
    if (error) {
      return databaseErrorState(
        error,
        documentErrorMessages,
        "Deleting a patient document",
      );
    }

    await removeStoredDocument(createAdminClient(), path as string);
    refresh();
    return { status: "success", message: "Document deleted." };
  },
);
