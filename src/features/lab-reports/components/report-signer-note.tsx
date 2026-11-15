import { BadgeCheckIcon } from "lucide-react";

import { signerLine, type LabSigner } from "@/features/lab-staff/lib/lab-staff";
import { cn } from "@/lib/utils";

type ReportSignerNoteProps = {
  signer: LabSigner;
  className?: string;
};

// Who signed the report off (LAB-17), as it's stamped on the PDF.
export function ReportSignerNote({ signer, className }: ReportSignerNoteProps) {
  return (
    <p
      className={cn(
        "flex items-start gap-1.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <BadgeCheckIcon className="mt-px size-3.5 shrink-0" aria-hidden />
      <span className="break-words">Signed off by {signerLine(signer)}</span>
    </p>
  );
}
