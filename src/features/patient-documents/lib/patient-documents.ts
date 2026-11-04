import type { PatientDocumentKind } from "@/features/patient-documents/lib/document-rules";

export type PatientDocumentRow = {
  id: string;
  kind: PatientDocumentKind;
  title: string;
  document_on: string | null;
  content_type: string;
  size_bytes: number | null;
  created_at: string;
};

export type PatientDocument = {
  id: string;
  kind: PatientDocumentKind;
  title: string;
  // The date on the document if the patient gave one, else when it was added.
  documentOn: string | null;
  contentType: string;
  sizeBytes: number | null;
  createdAt: string;
};

export function toPatientDocument(row: PatientDocumentRow): PatientDocument {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    documentOn: row.document_on,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  };
}

// "2.4 MB", "820 KB"
export function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export const documentErrorMessages: Record<string, string> = {
  invalid_document: "Check the document's details and try again.",
  document_limit:
    "You've reached the limit of 500 documents. Delete some to add more.",
  document_not_found: "That document no longer exists.",
};
