import { prepareDocumentUpload } from "@/features/patient-documents/actions/prepare-document-upload";
import { savePatientDocument } from "@/features/patient-documents/actions/save-patient-document";
import { PATIENT_DOCUMENTS_BUCKET } from "@/features/patient-documents/lib/document-rules";
import { uploadDocumentSchema } from "@/features/patient-documents/schemas/patient-document";
import {
  formError,
  initialFormState,
  validationError,
  type FormState,
} from "@/lib/form-state";
import { createClient } from "@/lib/supabase/client";

// Runs in the browser: gets a signed link, uploads straight to Storage, then
// asks the server to check and record what arrived.
export async function uploadPatientDocument(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = uploadDocumentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error);

  const { file, ...details } = parsed.data;
  const prepared = await prepareDocumentUpload(initialFormState, {
    type: file.type,
    size: file.size,
  });
  if (!prepared.upload) return prepared;

  const { path, token } = prepared.upload;
  const { error } = await createClient()
    .storage.from(PATIENT_DOCUMENTS_BUCKET)
    .uploadToSignedUrl(path, token, file, { contentType: file.type });
  if (error) {
    return formError(
      "We couldn't upload your file. Check your connection and try again.",
      "upload_failed",
    );
  }

  return savePatientDocument(initialFormState, { path, ...details });
}
