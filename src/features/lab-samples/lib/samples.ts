import { z } from "zod";

import { labMemberRoleSchema } from "@/features/lab-staff/lib/lab-permissions";

// Sample tracking (LAB-16). The database gives each collection attempt an
// accession number and each container a code under it (YYMMDD-NNNN-B); see
// docs/lab-samples.md.

export const sampleTypes = ["blood", "urine", "stool"] as const;
export type SampleType = (typeof sampleTypes)[number];

export const sampleTypeLabels: Record<SampleType, string> = {
  blood: "Blood",
  urine: "Urine",
  stool: "Stool",
};

export type LabSample = { code: string; sampleType: SampleType };

// A container as stored; the lists read only the first three columns.
export type LabSampleRecord = {
  code: string;
  sample_type: SampleType;
  rejected_at: string | null;
  created_at?: string;
  collected_at?: string | null;
  rejection_reason?: string | null;
};

// A container on the booking's page, with every column.
export type LabSampleDetail = Required<LabSampleRecord>;

// Labels can be printed before collection and reprinted until the report is
// out. The database checks the same.
export const PRINTABLE_STATUSES = [
  "booked",
  "recollection_needed",
  "sample_collected",
  "processing",
] as const;

export const isPrintable = (status: string) =>
  (PRINTABLE_STATUSES as readonly string[]).includes(status);

// The open containers on a booking, in code order (B, S, U).
export function openSamples(rows: LabSampleRecord[]): LabSample[] {
  return rows
    .filter((row) => row.rejected_at === null)
    .map((row) => ({ code: row.code, sampleType: row.sample_type }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

export const sampleLabelErrorMessages: Record<string, string> = {
  not_lab: "Only lab accounts can print labels.",
  not_permitted: "Your role in this lab doesn't take samples.",
  booking_not_found: "This booking isn't in your list.",
  not_printable: "Labels can't be printed for a finished or cancelled booking.",
};

// One step in a booking's history, as get_lab_booking_history returns it.
export const historyRowSchema = z.object({
  status: z.string(),
  kind: z.enum([
    "status",
    "rescheduled",
    "report_uploaded",
    "report_returned",
    "report_signed_off",
  ]),
  reason: z.string().nullable(),
  note: z.string().nullable(),
  visit_date: z.string().nullable(),
  slot_starts_at: z.string().nullable(),
  created_at: z.string(),
  actor: z.enum(["patient", "staff", "system"]),
  actor_name: z.string().nullable(),
  actor_role: labMemberRoleSchema.nullable(),
});

export type BookingHistoryStep = z.infer<typeof historyRowSchema>;
