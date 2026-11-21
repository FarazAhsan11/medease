import { FilePenLineIcon } from "lucide-react";

import type { ReportCorrection } from "@/features/lab-reports/lib/report-correction";
import { cn } from "@/lib/utils";

type ReportCorrectionNoteProps = {
  correction: ReportCorrection;
  // Opens the version it replaced, for whoever is viewing.
  previousHref: string;
  // How it starts; a correction still waiting for sign-off says so.
  label?: string;
  className?: string;
};

// Says the report shown was corrected (LAB-18), why, and links to the version
// it replaced, which is kept.
export function ReportCorrectionNote({
  correction,
  previousHref,
  label = "Corrected report.",
  className,
}: ReportCorrectionNoteProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-xs",
        className,
      )}
    >
      <FilePenLineIcon className="mt-px size-3.5 shrink-0" aria-hidden />
      <p className="min-w-0 break-words">
        <span className="font-medium">{label}</span> {correction.reason}{" "}
        {/* A plain link: the route redirects to the file. */}
        <a
          href={previousHref}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium whitespace-nowrap text-primary hover:underline"
        >
          Version it replaces
        </a>
      </p>
    </div>
  );
}
