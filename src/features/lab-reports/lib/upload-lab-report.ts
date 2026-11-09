import { prepareReportUpload } from "@/features/lab-reports/actions/prepare-report-upload";
import { publishLabReport } from "@/features/lab-reports/actions/publish-lab-report";
import { LAB_REPORTS_BUCKET } from "@/features/lab-reports/lib/lab-reports";
import { uploadReportSchema } from "@/features/lab-reports/schemas/lab-report";
import {
  formError,
  initialFormState,
  validationError,
  type FormState,
} from "@/lib/form-state";
import { createClient } from "@/lib/supabase/client";

// Runs in the browser: gets a signed link, uploads straight to Storage, then
// asks the server to check what arrived and publish it.
export async function uploadLabReport(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = uploadReportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error);

  const { bookingId, file } = parsed.data;
  const prepared = await prepareReportUpload(initialFormState, {
    bookingId,
    type: file.type,
    size: file.size,
  });
  if (!prepared.upload) return prepared;

  const { path, token } = prepared.upload;
  const { error } = await createClient()
    .storage.from(LAB_REPORTS_BUCKET)
    .uploadToSignedUrl(path, token, file, { contentType: file.type });
  if (error) {
    return formError(
      "We couldn't upload the report. Check your connection and try again.",
      "upload_failed",
    );
  }

  return publishLabReport(initialFormState, { bookingId, path });
}
