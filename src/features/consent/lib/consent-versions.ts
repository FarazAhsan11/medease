import type { DashboardRole } from "@/config/dashboards";
import { getLegalDocument } from "@/features/legal/data/legal-documents";

import { requiredConsents, type ConsentDocument } from "./consent-documents";

export type ConsentRow = {
  document: string;
  version: string;
  withdrawn_at: string | null;
};

function currentVersion(document: ConsentDocument) {
  const legalDocument = getLegalDocument(document);
  if (!legalDocument) throw new Error(`No legal document: ${document}`);

  return legalDocument.version;
}

// What gets saved: each document with the version on the site right now.
export const withVersions = (documents: readonly ConsentDocument[]) =>
  documents.map((document) => ({
    document,
    version: currentVersion(document),
  }));

// Rows come newest first. A withdrawal stands until the person changes their
// mind in Settings: asking again at every sign-in would make it meaningless.
export function getPendingDocuments(role: DashboardRole, rows: ConsentRow[]) {
  return requiredConsents[role].filter((document) => {
    const latest = rows.find((row) => row.document === document);
    if (!latest) return true;
    if (latest.withdrawn_at) return false;

    return latest.version !== currentVersion(document);
  });
}
