import { FileTextIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PanelCard } from "@/components/shared/panel-card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocumentRow } from "@/features/patient-documents/components/document-row";
import { UploadDocumentSheet } from "@/features/patient-documents/components/upload-document-sheet";
import type { PatientDocument } from "@/features/patient-documents/lib/patient-documents";

type DocumentsTableProps = {
  documents: PatientDocument[];
};

export function DocumentsTable({ documents }: DocumentsTableProps) {
  return (
    <PanelCard
      title="Documents"
      description={
        documents.length === 1 ? "1 file" : `${documents.length} files`
      }
      action={<UploadDocumentSheet />}
    >
      {documents.length === 0 ? (
        <div className="p-5">
          <EmptyState
            icon={FileTextIcon}
            title="No documents yet"
            description="Upload lab reports, scans and prescriptions from other clinics to keep them in one place. Only you can see them."
          />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="hidden sm:table-cell">Date</TableHead>
              <TableHead className="hidden md:table-cell">Size</TableHead>
              <TableHead className="pr-5 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((document) => (
              <DocumentRow key={document.id} document={document} />
            ))}
          </TableBody>
        </Table>
      )}
    </PanelCard>
  );
}
