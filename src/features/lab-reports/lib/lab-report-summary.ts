import type { CareRecipientRelation } from "@/features/family/lib/relations";

// A published report with what's needed to list it: whose it is, which tests,
// and which lab.
export type LabReportSummary = {
  id: string;
  publishedAt: string;
  labName: string;
  timezone: string;
  careRecipientName: string;
  careRecipientRelation: CareRecipientRelation;
  testNames: string[];
};

export type LabReportSummaryRow = {
  id: string;
  created_at: string;
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
    publishedAt: row.created_at,
    labName: booking.lab_name,
    timezone: booking.timezone,
    careRecipientName: booking.care_recipient_name,
    careRecipientRelation: booking.care_recipient_relation,
    testNames: booking.lab_booking_items
      .map((item) => item.name)
      .sort((a, b) => a.localeCompare(b)),
  };
}
