import "server-only";

import {
  toPatientDocument,
  type PatientDocument,
  type PatientDocumentRow,
} from "@/features/patient-documents/lib/patient-documents";
import { createClient } from "@/lib/supabase/server";

const COLUMNS =
  "id, kind, title, document_on, content_type, size_bytes, created_at";

// Read through row level security: a patient sees only their own documents.
export async function getPatientDocuments(): Promise<PatientDocument[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patient_documents")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .returns<PatientDocumentRow[]>();

  if (error) throw new Error(`patient_documents: ${error.message}`);
  return data.map(toPatientDocument);
}

// The file's path, if the signed-in user may read this document.
export async function getReadableDocumentPath(
  documentId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patient_documents")
    .select("storage_path")
    .eq("id", documentId)
    .maybeSingle<{ storage_path: string }>();

  if (error) throw new Error(`patient_documents: ${error.message}`);
  return data?.storage_path ?? null;
}
