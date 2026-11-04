import { notFound, redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getReadableDocumentPath } from "@/features/patient-documents/data/patient-documents";
import { PATIENT_DOCUMENTS_BUCKET } from "@/features/patient-documents/lib/document-rules";
import { DOCUMENT_LINK_SECONDS } from "@/features/patient-documents/lib/patient-documents.server";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

// Opens a patient's document. The row is read with the patient's own session,
// so row level security (and its second-factor rule) is the permission check;
// only then does the secret key sign a link that lasts a minute.
export async function GET(
  _request: NextRequest,
  context: RouteContext<"/patient/records/documents/[id]">,
) {
  const { id } = await context.params;
  await requireRole("patient");

  const documentId = z.uuid().safeParse(id);
  const path = documentId.success
    ? await getReadableDocumentPath(documentId.data)
    : null;
  if (!path) notFound();

  const { data, error } = await createAdminClient()
    .storage.from(PATIENT_DOCUMENTS_BUCKET)
    .createSignedUrl(path, DOCUMENT_LINK_SECONDS);
  if (error) throw new Error(`${PATIENT_DOCUMENTS_BUCKET}: ${error.message}`);

  redirect(data.signedUrl);
}
