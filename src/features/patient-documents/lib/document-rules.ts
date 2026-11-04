export const PATIENT_DOCUMENTS_BUCKET = "patient-documents";

export const MAX_DOCUMENT_MB = 10;

export const MAX_DOCUMENT_TITLE = 120;

const MB = 1024 * 1024;

export const MAX_DOCUMENT_BYTES = MAX_DOCUMENT_MB * MB;

// Each accepted file type and the extension it's stored with.
export const documentFileTypes: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export const DOCUMENT_ACCEPT = Object.keys(documentFileTypes).join(",");

export const patientDocumentKinds = [
  "lab_report",
  "imaging",
  "prescription",
  "discharge_summary",
  "other",
] as const;

export type PatientDocumentKind = (typeof patientDocumentKinds)[number];

export const documentKindLabels: Record<PatientDocumentKind, string> = {
  lab_report: "Lab report",
  imaging: "Imaging",
  prescription: "Outside prescription",
  discharge_summary: "Discharge summary",
  other: "Other",
};

export function isAllowedDocumentFile(type: string, size: number) {
  return type in documentFileTypes && size > 0 && size <= MAX_DOCUMENT_BYTES;
}
