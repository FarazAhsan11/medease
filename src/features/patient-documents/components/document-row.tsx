import { ExternalLinkIcon, FileTextIcon, ImageIcon } from "lucide-react";

import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { patientRoutes } from "@/config/routes";
import { DeleteDocumentDialog } from "@/features/patient-documents/components/delete-document-dialog";
import {
  documentKindLabels,
  type PatientDocumentKind,
} from "@/features/patient-documents/lib/document-rules";
import {
  formatFileSize,
  type PatientDocument,
} from "@/features/patient-documents/lib/patient-documents";
import { formatDateKey, toDateKey } from "@/lib/datetime";

const kindTones: Record<PatientDocumentKind, StatusTone> = {
  lab_report: "success",
  imaging: "warning",
  prescription: "info",
  discharge_summary: "info",
  other: "muted",
};

// Upload dates are shown on clinic time, like the rest of the app.
const CLINIC_TIMEZONE = "Asia/Karachi";

export function DocumentRow({ document }: { document: PatientDocument }) {
  const Icon = document.contentType.startsWith("image/")
    ? ImageIcon
    : FileTextIcon;
  const date =
    document.documentOn ?? toDateKey(document.createdAt, CLINIC_TIMEZONE);

  return (
    <TableRow>
      <TableCell className="max-w-48 pl-5 sm:max-w-72">
        <span className="flex items-center gap-2 font-medium">
          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">{document.title}</span>
        </span>
      </TableCell>
      <TableCell>
        <StatusBadge tone={kindTones[document.kind]}>
          {documentKindLabels[document.kind]}
        </StatusBadge>
      </TableCell>
      <TableCell className="hidden text-muted-foreground sm:table-cell">
        {formatDateKey(date)}
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">
        {document.sizeBytes ? formatFileSize(document.sizeBytes) : "—"}
      </TableCell>
      <TableCell className="pr-5 text-right">
        <span className="inline-flex items-center gap-1">
          {/* A plain link: the route answers with a redirect to the file. */}
          <a
            href={patientRoutes.recordDocument(document.id)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ size: "icon-sm", variant: "ghost" })}
            aria-label={`Open ${document.title}`}
          >
            <ExternalLinkIcon />
          </a>
          <DeleteDocumentDialog
            documentId={document.id}
            title={document.title}
          />
        </span>
      </TableCell>
    </TableRow>
  );
}
