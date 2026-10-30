import { prepareDocumentUploads } from "@/features/doctor-verification/actions/prepare-document-uploads";
import { saveVerificationDocuments } from "@/features/doctor-verification/actions/save-verification-documents";
import {
  DOCUMENTS_BUCKET,
  type DocumentKind,
} from "@/features/doctor-verification/lib/document-rules";
import { verificationDocumentsSchema } from "@/features/doctor-verification/schemas/verification";
import {
  formError,
  initialFormState,
  validationError,
  type FormState,
} from "@/lib/form-state";
import { createClient } from "@/lib/supabase/client";

// Runs in the browser: gets a signed link per file, uploads straight to
// Storage, then asks the server to check and record what arrived.
export async function uploadDocuments(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = verificationDocumentsSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return validationError(parsed.error);

  const { profilePhoto, licenseDocument, degreeDocument } = parsed.data;
  const chosen: [DocumentKind, File | undefined][] = [
    ["photo", profilePhoto],
    ["license", licenseDocument],
    ["degree", degreeDocument],
  ];
  const files = new Map(
    chosen.filter((entry): entry is [DocumentKind, File] => Boolean(entry[1])),
  );

  const prepared = await prepareDocumentUploads(
    initialFormState,
    [...files].map(([kind, file]) => ({
      kind,
      type: file.type,
      size: file.size,
    })),
  );
  if (!prepared.uploads) return prepared;

  const storage = createClient().storage.from(DOCUMENTS_BUCKET);
  const results = await Promise.all(
    prepared.uploads.map(({ kind, path, token }) => {
      const file = files.get(kind) as File;
      return storage.uploadToSignedUrl(path, token, file, {
        contentType: file.type,
      });
    }),
  );
  if (results.some((result) => result.error)) {
    return formError(
      "We couldn't upload your files. Check your connection and try again.",
      "upload_failed",
    );
  }

  return saveVerificationDocuments(
    initialFormState,
    prepared.uploads.map(({ kind, path }) => ({ kind, path })),
  );
}
