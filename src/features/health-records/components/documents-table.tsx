import { DownloadIcon, FileTextIcon, UploadIcon } from "lucide-react";

import { PanelCard } from "@/components/shared/panel-card";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { HealthDocument } from "@/features/health-records/data/health-records";

const typeTones: Record<HealthDocument["type"], StatusTone> = {
  "Lab report": "success",
  Prescription: "info",
  "Visit summary": "muted",
  Imaging: "warning",
};

type DocumentsTableProps = {
  documents: HealthDocument[];
};

export function DocumentsTable({ documents }: DocumentsTableProps) {
  return (
    <PanelCard
      title="Documents"
      description={`${documents.length} files`}
      action={
        <Button size="sm" variant="outline" className="gap-1.5">
          <UploadIcon aria-hidden />
          Upload
        </Button>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-5">Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="hidden md:table-cell">Source</TableHead>
            <TableHead className="hidden sm:table-cell">Date</TableHead>
            <TableHead className="pr-5 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document) => (
            <TableRow key={document.id}>
              <TableCell className="pl-5">
                <span className="flex items-center gap-2 font-medium">
                  <FileTextIcon
                    className="size-4 text-muted-foreground"
                    aria-hidden
                  />
                  {document.name}
                </span>
              </TableCell>
              <TableCell>
                <StatusBadge tone={typeTones[document.type]}>
                  {document.type}
                </StatusBadge>
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {document.source}
              </TableCell>
              <TableCell className="hidden text-muted-foreground sm:table-cell">
                {document.date}
              </TableCell>
              <TableCell className="pr-5 text-right">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Download ${document.name}`}
                >
                  <DownloadIcon />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PanelCard>
  );
}
