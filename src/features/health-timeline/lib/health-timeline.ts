import {
  hasTakenPlace,
  type Appointment,
} from "@/features/appointments/lib/appointments";
import type { CareRecipientRelation } from "@/features/family/lib/relations";
import type { LabReportSummary } from "@/features/lab-reports/lib/lab-report-summary";
import type { PatientDocumentKind } from "@/features/patient-documents/lib/document-rules";
import type { PatientDocument } from "@/features/patient-documents/lib/patient-documents";
import {
  medicineName,
  type Prescription,
} from "@/features/prescriptions/lib/prescriptions";
import type { VisitSummary } from "@/features/visit-summaries/lib/visit-summaries";
import { CLINIC_TIMEZONE, toDateKey } from "@/lib/datetime";

export const timelineTypes = [
  "visit",
  "prescription",
  "lab_report",
  "document",
] as const;

export type TimelineType = (typeof timelineTypes)[number];

export const timelineTypeLabels: Record<TimelineType, string> = {
  visit: "Visits",
  prescription: "Prescriptions",
  lab_report: "Lab reports",
  document: "Documents",
};

export function parseTimelineType(value: unknown): TimelineType | null {
  return timelineTypes.find((type) => type === value) ?? null;
}

type EntryBase = {
  id: string;
  // The calendar day it belongs to, "YYYY-MM-DD", and an exact time to order
  // entries within that day.
  dateKey: string;
  at: string;
};

export type TimelineEntry =
  | (EntryBase & {
      type: "visit";
      doctorName: string;
      doctorSpecialization: string;
      // The visit summary the doctor wrote, shown with its visit.
      diagnosis: string | null;
      followUpOn: string | null;
    })
  | (EntryBase & {
      type: "prescription";
      doctorName: string;
      medicines: string[];
      cancelled: boolean;
    })
  | (EntryBase & {
      type: "lab_report";
      labName: string;
      testNames: string[];
      careRecipientName: string;
      careRecipientRelation: CareRecipientRelation;
    })
  | (EntryBase & {
      type: "document";
      title: string;
      kind: PatientDocumentKind;
    });

type TimelineSources = {
  appointments: Appointment[];
  summaries: Record<string, VisitSummary>;
  prescriptions: Prescription[];
  documents: PatientDocument[];
  labReports: LabReportSummary[];
};

// Everything in one list, newest first. Replaced prescription versions are
// already left out by the loader.
export function buildTimeline(
  {
    appointments,
    summaries,
    prescriptions,
    documents,
    labReports,
  }: TimelineSources,
  now = Date.now(),
): TimelineEntry[] {
  const visits = appointments
    .filter((appointment) => hasTakenPlace(appointment, now))
    .map((appointment): TimelineEntry => {
      const summary = summaries[appointment.id];
      return {
        type: "visit",
        id: appointment.id,
        dateKey: toDateKey(appointment.startsAt, appointment.timezone),
        at: appointment.startsAt,
        doctorName: appointment.doctorName,
        doctorSpecialization: appointment.doctorSpecialization,
        diagnosis: summary?.diagnosis ?? null,
        followUpOn: summary?.followUpOn ?? null,
      };
    });

  const issued = prescriptions.map((prescription): TimelineEntry => ({
    type: "prescription",
    id: prescription.id,
    dateKey: toDateKey(prescription.issuedAt, prescription.timezone),
    at: prescription.issuedAt,
    doctorName: prescription.doctorName,
    medicines: prescription.items.map(medicineName),
    cancelled: prescription.status === "cancelled",
  }));

  const files = documents.map((document): TimelineEntry => ({
    type: "document",
    id: document.id,
    dateKey:
      document.documentOn ?? toDateKey(document.createdAt, CLINIC_TIMEZONE),
    at: document.createdAt,
    title: document.title,
    kind: document.kind,
  }));

  const reports = labReports.map((report): TimelineEntry => ({
    type: "lab_report",
    id: report.id,
    dateKey: toDateKey(report.publishedAt, report.timezone),
    at: report.publishedAt,
    labName: report.labName,
    testNames: report.testNames,
    careRecipientName: report.careRecipientName,
    careRecipientRelation: report.careRecipientRelation,
  }));

  return [...visits, ...issued, ...reports, ...files].sort(
    (a, b) => b.dateKey.localeCompare(a.dateKey) || b.at.localeCompare(a.at),
  );
}

// Consecutive entries grouped by month ("2026-10"), keeping their order.
export function groupByMonth(entries: TimelineEntry[]) {
  const groups: { month: string; entries: TimelineEntry[] }[] = [];
  for (const entry of entries) {
    const month = entry.dateKey.slice(0, 7);
    const last = groups.at(-1);
    if (last?.month === month) last.entries.push(entry);
    else groups.push({ month, entries: [entry] });
  }
  return groups;
}
