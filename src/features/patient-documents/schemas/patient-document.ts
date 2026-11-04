import { z } from "zod";

import {
  documentFileTypes,
  isAllowedDocumentFile,
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENT_MB,
  MAX_DOCUMENT_TITLE,
  patientDocumentKinds,
} from "@/features/patient-documents/lib/document-rules";
import type { FormState } from "@/lib/form-state";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;

const documentDetails = {
  title: z
    .string()
    .trim()
    .min(1, "Give the document a name.")
    .max(MAX_DOCUMENT_TITLE, `Use ${MAX_DOCUMENT_TITLE} characters or fewer.`),
  kind: z.enum(patientDocumentKinds, "Choose a type."),
  // The database refuses dates after tomorrow, which allows for time zones.
  documentOn: z.preprocess(
    emptyToUndefined,
    z.iso
      .date("Enter a valid date.")
      .refine((date) => date >= "1900-01-01", "Enter a valid date.")
      .optional(),
  ),
};

// Checked in the browser, because the file never reaches our server.
export const uploadDocumentSchema = z.object({
  file: z.preprocess(
    (value) => (value instanceof File && value.size > 0 ? value : undefined),
    z
      .file("Choose a file.")
      .max(
        MAX_DOCUMENT_BYTES,
        `The file must be ${MAX_DOCUMENT_MB} MB or smaller.`,
      )
      .mime(
        Object.keys(documentFileTypes),
        "The file must be a PDF, JPG or PNG.",
      ),
  ),
  ...documentDetails,
});

export const requestedUploadSchema = z
  .object({ type: z.string(), size: z.number() })
  .refine(({ type, size }) => isAllowedDocumentFile(type, size));

export const uploadedDocumentSchema = z.object({
  path: z.string().max(300),
  ...documentDetails,
});

export const deleteDocumentSchema = z.object({ documentId: z.uuid() });

export type PreparedUploadState = FormState & {
  upload?: { path: string; token: string };
};
