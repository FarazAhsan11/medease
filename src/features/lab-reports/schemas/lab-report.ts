import { z } from "zod";

import {
  isAllowedReportFile,
  MAX_REPORT_BYTES,
  MAX_REPORT_MB,
  reportFileTypes,
} from "@/features/lab-reports/lib/lab-reports";
import type { FormState } from "@/lib/form-state";

// Checked in the browser, because the file never reaches our server. An empty
// file input still submits a nameless, zero-byte File.
export const uploadReportSchema = z.object({
  bookingId: z.uuid(),
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
  .object({ bookingId: z.uuid(), type: z.string(), size: z.number() })
  .refine(({ type, size }) => isAllowedReportFile(type, size));

export const uploadedReportSchema = z.object({
  bookingId: z.uuid(),
  path: z.string().max(300),
});

export type PreparedReportUploadState = FormState & {
  upload?: { path: string; token: string };
};
