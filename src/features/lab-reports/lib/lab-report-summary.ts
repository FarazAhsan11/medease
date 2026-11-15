import type { CareRecipientRelation } from "@/features/family/lib/relations";
import type { LabSigner } from "@/features/lab-staff/lib/lab-staff";

// A report with what's needed to list it: whose it is, which tests, which lab,
// and, once released, who signed it off (LAB-17).
export type LabReportSummary = {
  id: string;
  bookingId: string;
  uploadedAt: string;
  // When the patient could open it; null while it waits for sign-off.
  publishedAt: string | null;
  // Null for reports published before sign-off existed.
  signer: LabSigner | null;
  labName: string;
  timezone: string;
  careRecipientName: string;
  careRecipientRelation: CareRecipientRelation;
  testNames: string[];
};

export type LabReportSummaryRow = {
  id: string;
  booking_id: string;
  created_at: string;
  released_at: string | null;
  signer_name: string | null;
  signer_title: string | null;
  lab_bookings: {
    lab_name: string;
    timezone: string;
    care_recipient_name: string;
    care_recipient_relation: CareRecipientRelation;
    lab_booking_items: { name: string }[];
  };
};

export function toLabReportSummary(row: LabReportSummaryRow): LabReportSummary {
  const booking = row.lab_bookings;
  return {
    id: row.id,
    bookingId: row.booking_id,
    uploadedAt: row.created_at,
    publishedAt: row.released_at,
    signer:
      row.signer_name && row.signer_title
        ? { name: row.signer_name, title: row.signer_title }
        : null,
    labName: booking.lab_name,
    timezone: booking.timezone,
    careRecipientName: booking.care_recipient_name,
    careRecipientRelation: booking.care_recipient_relation,
    testNames: booking.lab_booking_items
      .map((item) => item.name)
      .sort((a, b) => a.localeCompare(b)),
  };
}
