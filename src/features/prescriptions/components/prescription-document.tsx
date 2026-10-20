import { CircleAlertIcon, HistoryIcon } from "lucide-react";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { PrescriptionItemDetails } from "@/features/prescriptions/components/prescription-item-details";
import { PrescriptionStatusBadge } from "@/features/prescriptions/components/prescription-status-badge";
import {
  getDisplayStatus,
  type Prescription,
} from "@/features/prescriptions/lib/prescriptions";
import { formatDate, formatDateTime } from "@/lib/datetime";

type PrescriptionDocumentProps = {
  prescription: Prescription;
  // Wording of the cancellation note depends on who is reading.
  viewer: "patient" | "doctor";
  // For a replaced version: where the newer one is.
  replacementHref?: string | null;
};

// The full prescription, laid out to print cleanly on one page.
export function PrescriptionDocument({
  prescription,
  viewer,
  replacementHref,
}: PrescriptionDocumentProps) {
  const { timezone } = prescription;

  return (
    <article className="rounded-2xl border bg-card print:rounded-none print:border-0">
      {prescription.status === "cancelled" && (
        <div className="flex gap-3 border-b bg-destructive/10 px-5 py-4 text-sm text-destructive sm:px-8">
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">
              Cancelled
              {prescription.cancelledAt &&
                ` on ${formatDate(prescription.cancelledAt, timezone)}`}
              .{" "}
              {viewer === "patient"
                ? "Stop taking these medicines unless your doctor tells you otherwise."
                : "The patient has been told to stop taking these medicines."}
            </p>
            {prescription.cancellationReason && (
              <p className="mt-1">Reason: {prescription.cancellationReason}</p>
            )}
          </div>
        </div>
      )}

      {prescription.status === "replaced" && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-muted px-5 py-4 text-sm sm:px-8">
          <HistoryIcon className="size-4 shrink-0" aria-hidden />
          <p className="flex-1">
            This is an older version. The doctor updated this prescription.
          </p>
          {replacementHref && (
            <Link
              href={replacementHref}
              className="font-medium text-primary hover:underline print:hidden"
            >
              View the latest version
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-6 p-5 sm:p-8">
        <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">
              {prescription.doctorName}
            </h2>
            <p className="text-sm text-muted-foreground">
              {prescription.doctorSpecialization}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              License: {prescription.doctorLicense}
            </p>
            <p className="text-xs text-muted-foreground">
              {prescription.clinicAddress}
            </p>
          </div>
          <div className="shrink-0 sm:text-right">
            <div className="flex items-center gap-2 sm:justify-end">
              <p className="text-sm font-semibold">Prescription</p>
              <PrescriptionStatusBadge
                status={getDisplayStatus(prescription)}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDateTime(prescription.issuedAt, timezone)}
            </p>
          </div>
        </header>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Patient</dt>
            <dd className="font-medium">{prescription.patientName}</dd>
          </div>
          {prescription.diagnosis && (
            <div>
              <dt className="text-xs text-muted-foreground">Diagnosis</dt>
              <dd className="font-medium">{prescription.diagnosis}</dd>
            </div>
          )}
        </dl>

        <section>
          <h3 className="text-sm font-semibold">
            Medicines{" "}
            <span className="font-normal text-muted-foreground">
              ({prescription.items.length})
            </span>
          </h3>
          <ol className="mt-1 divide-y">
            {prescription.items.map((item, index) => (
              <PrescriptionItemDetails
                key={item.id}
                item={item}
                number={index + 1}
              />
            ))}
          </ol>
        </section>

        {prescription.advice && (
          <section className="rounded-xl bg-muted p-4 text-sm">
            <h3 className="text-xs font-medium text-muted-foreground">
              Advice
            </h3>
            <p className="mt-1 whitespace-pre-line">{prescription.advice}</p>
          </section>
        )}

        <footer className="border-t pt-4 text-xs text-muted-foreground">
          Issued electronically through {siteConfig.name}. Reference{" "}
          {prescription.id.slice(0, 8).toUpperCase()}.
        </footer>
      </div>
    </article>
  );
}
