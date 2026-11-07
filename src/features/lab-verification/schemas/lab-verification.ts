import { z } from "zod";

import {
  isAllowedLicenseFile,
  licenseRule,
  licensingAuthorityKeys,
} from "@/features/lab-verification/lib/lab-verification";
import type { FormState } from "@/lib/form-state";
import { MB } from "@/lib/uploads/file-size";
import { reviewDecisions, submittedAtField } from "@/lib/verification";

const details = {
  registrationNumber: z
    .string()
    .trim()
    .min(1, "Enter your licence or registration number.")
    .max(40, "Use 40 characters or fewer."),
  licensingAuthority: z.enum(licensingAuthorityKeys, {
    error: "Choose who licensed your lab.",
  }),
  address: z
    .string()
    .trim()
    .min(1, "Enter your lab's address.")
    .max(300, "Use 300 characters or fewer."),
};

// Checked in the browser, because the file never reaches our server. An empty
// file input still submits a nameless, zero-byte File.
export const labVerificationFormSchema = z.object({
  ...details,
  licenseDocument: z.preprocess(
    (value) => (value instanceof File && value.size > 0 ? value : undefined),
    z
      .file()
      .max(
        licenseRule.maxMb * MB,
        `${licenseRule.label} must be ${licenseRule.maxMb} MB or smaller.`,
      )
      .mime(
        Object.keys(licenseRule.types),
        `${licenseRule.label} must be a ${Object.values(licenseRule.types).join(", ")} file.`,
      )
      .optional(),
  ),
});

export const requestedLicenseUploadSchema = z
  .object({ type: z.string(), size: z.number() })
  .refine(({ type, size }) => isAllowedLicenseFile(type, size));

// What the server action receives after any upload has finished.
export const labVerificationSchema = z.object({
  ...details,
  licensePath: z.string().max(300).optional(),
});

export type LabVerificationInput = z.infer<typeof labVerificationSchema>;

export type LicenseUpload = { path: string; token: string };

export type PreparedLicenseUploadState = FormState & {
  upload?: LicenseUpload;
};

export const reviewLabSchema = z
  .object({
    labId: z.uuid(),
    submittedAt: submittedAtField,
    decision: z.enum(reviewDecisions),
    note: z.string().trim().max(500, "Use 500 characters or fewer.").optional(),
  })
  .refine(({ decision, note }) => decision === "approved" || note, {
    message: "Tell the lab what's needed.",
    path: ["note"],
  });
