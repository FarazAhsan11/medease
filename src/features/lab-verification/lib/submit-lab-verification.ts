import { prepareLicenseUpload } from "@/features/lab-verification/actions/prepare-license-upload";
import { saveLabVerification } from "@/features/lab-verification/actions/save-lab-verification";
import { LAB_DOCUMENTS_BUCKET } from "@/features/lab-verification/lib/lab-verification";
import { labVerificationFormSchema } from "@/features/lab-verification/schemas/lab-verification";
import {
  formError,
  initialFormState,
  validationError,
  type FormState,
} from "@/lib/form-state";
import { createClient } from "@/lib/supabase/client";

// Runs in the browser: a new licence goes straight to Storage on a signed
// link, then the server checks it and records the details.
export async function submitLabVerification(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = labVerificationFormSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return validationError(parsed.error);

  const { licenseDocument, ...details } = parsed.data;
  if (!licenseDocument) {
    return saveLabVerification(initialFormState, details);
  }

  const prepared = await prepareLicenseUpload(initialFormState, {
    type: licenseDocument.type,
    size: licenseDocument.size,
  });
  if (!prepared.upload) return prepared;

  const { path, token } = prepared.upload;
  const { error } = await createClient()
    .storage.from(LAB_DOCUMENTS_BUCKET)
    .uploadToSignedUrl(path, token, licenseDocument, {
      contentType: licenseDocument.type,
    });
  if (error) {
    return formError(
      "We couldn't upload your licence. Check your connection and try again.",
      "upload_failed",
    );
  }

  return saveLabVerification(initialFormState, {
    ...details,
    licensePath: path,
  });
}
