import { z } from "zod";

import {
  documentKinds,
  documentRules,
  isAllowedFile,
  type DocumentKind,
} from "@/features/doctor-verification/lib/document-rules";
import type { FormState } from "@/lib/form-state";

const MB = 1024 * 1024;

// An empty file input still submits a nameless, zero-byte File.
function documentFile(kind: DocumentKind) {
  const { label, maxMb, types } = documentRules[kind];

  return z.preprocess(
    (value) => (value instanceof File && value.size > 0 ? value : undefined),
    z
      .file()
      .max(maxMb * MB, `${label} must be ${maxMb} MB or smaller.`)
      .mime(
        Object.keys(types),
        `${label} must be a ${Object.values(types).join(", ")} file.`,
      )
      .optional(),
  );
}

// Checked in the browser, because the files never reach our server.
export const verificationDocumentsSchema = z
  .object({
    profilePhoto: documentFile("photo"),
    licenseDocument: documentFile("license"),
    degreeDocument: documentFile("degree"),
  })
  .refine(
    (files) =>
      files.profilePhoto || files.licenseDocument || files.degreeDocument,
    { message: "Choose at least one file.", path: ["licenseDocument"] },
  );

const documentKind = z.enum(documentKinds);

export const requestedUploadsSchema = z
  .array(
    z
      .object({ kind: documentKind, type: z.string(), size: z.number() })
      .refine(({ kind, type, size }) => isAllowedFile(kind, type, size)),
  )
  .min(1)
  .max(documentKinds.length);

export const uploadedDocumentsSchema = z
  .array(z.object({ kind: documentKind, path: z.string().max(300) }))
  .min(1)
  .max(documentKinds.length);

export type DocumentUpload = {
  kind: DocumentKind;
  path: string;
  token: string;
};

export type PreparedUploadsState = FormState & { uploads?: DocumentUpload[] };

export const reviewDoctorSchema = z
  .object({
    doctorId: z.uuid(),
    decision: z.enum(["approved", "needs_info", "rejected"]),
    note: z.string().trim().max(500, "Use 500 characters or fewer.").optional(),
  })
  .refine(({ decision, note }) => decision === "approved" || note, {
    message: "Tell the doctor what's needed.",
    path: ["note"],
  });
