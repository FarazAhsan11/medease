import { z } from "zod";

import {
  CORRECTION_REASON_MESSAGE,
  CORRECTION_REASON_PATTERN,
  isAllowedReportFile,
  MAX_CORRECTION_REASON,
  MIN_CORRECTION_REASON,
  MAX_REPORT_BYTES,
  MAX_REPORT_MB,
  MAX_RETURN_NOTE,
  reportFileTypes,
} from "@/features/lab-reports/lib/lab-reports";
import type { FormState } from "@/lib/form-state";

// Why a released report is being corrected (LAB-18): spaces and line breaks
// collapse to single spaces, as the database does, because the stamp prints it
// on one line.
export const correctionReasonSchema = z
  .string()
  .transform((value) => value.replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(MIN_CORRECTION_REASON, CORRECTION_REASON_MESSAGE)
      .max(MAX_CORRECTION_REASON, CORRECTION_REASON_MESSAGE)
      .regex(CORRECTION_REASON_PATTERN, CORRECTION_REASON_MESSAGE),
  );

// Checked in the browser, because the file never reaches our server. An empty
// file input still submits a nameless, zero-byte File.
export const uploadReportSchema = z.object({
  bookingId: z.uuid(),
  // A signer uploading can sign it off in the same step (LAB-17).
  signNow: z.literal("1").optional(),
  // Present when the upload corrects a released report.
  reason: correctionReasonSchema.optional(),
  file: z.preprocess(
    (value) => (value instanceof File && value.size > 0 ? value : undefined),
    z
      .file("Choose the report's PDF.")
      .max(
        MAX_REPORT_BYTES,
        `The report must be ${MAX_REPORT_MB} MB or smaller.`,
      )
      .mime(Object.keys(reportFileTypes), "The report must be a PDF."),
  ),
});

export const requestedReportUploadSchema = z
  .object({
    bookingId: z.uuid(),
    type: z.string(),
    size: z.number(),
    correcting: z.boolean().default(false),
  })
  .refine(({ type, size }) => isAllowedReportFile(type, size));

export const uploadedReportSchema = z.object({
  bookingId: z.uuid(),
  path: z.string().max(300),
  signNow: z.boolean().default(false),
  reason: correctionReasonSchema.optional(),
});

export const labReportIdSchema = z.object({ reportId: z.uuid() });

export const returnLabReportSchema = labReportIdSchema.extend({
  note: z
    .string()
    .trim()
    .min(1, "Say what needs changing.")
    .max(MAX_RETURN_NOTE, `Use ${MAX_RETURN_NOTE} characters or fewer.`),
});

export type PreparedReportUploadState = FormState & {
  upload?: { path: string; token: string };
};
