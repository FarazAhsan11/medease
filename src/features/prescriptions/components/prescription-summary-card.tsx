import { FileTextIcon } from "lucide-react";
import Link from "next/link";

import { IconTile } from "@/components/shared/icon-tile";
import { buttonVariants } from "@/components/ui/button";
import { PrescriptionStatusBadge } from "@/features/prescriptions/components/prescription-status-badge";
import {
  getDisplayStatus,
  medicineName,
  type Prescription,
} from "@/features/prescriptions/lib/prescriptions";
import { formatDate } from "@/lib/datetime";

type PrescriptionSummaryCardProps = {
  prescription: Prescription;
  // Link to the full prescription; left out where it's already on the page.
  href?: string;
};

export function PrescriptionSummaryCard({
  prescription,
  href,
}: PrescriptionSummaryCardProps) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <IconTile icon={FileTextIcon} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{prescription.doctorName}</h3>
            <PrescriptionStatusBadge status={getDisplayStatus(prescription)} />
          </div>
          <p className="text-xs text-muted-foreground">
            {prescription.doctorSpecialization} ·{" "}
            {formatDate(prescription.issuedAt, prescription.timezone)}
          </p>
          {prescription.diagnosis && (
            <p className="mt-2 text-sm">{prescription.diagnosis}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {prescription.items.map(medicineName).join(", ")}
          </p>
          {prescription.status === "cancelled" &&
            prescription.cancellationReason && (
              <p className="mt-1 text-xs text-destructive">
                Cancelled: {prescription.cancellationReason}
              </p>
            )}
        </div>
      </div>
      {href && (
        <Link
          href={href}
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: "w-fit",
          })}
        >
          View
        </Link>
      )}
    </article>
  );
}
