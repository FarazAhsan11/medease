import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { BackLink } from "@/components/shared/back-link";
import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { PrintButton } from "@/components/shared/print-button";
import { labRoutes } from "@/config/routes";
import { getLabBooking } from "@/features/lab-booking/data/lab-bookings";
import { PrintLabelsButton } from "@/features/lab-samples/components/print-labels-button";
import { SampleLabel } from "@/features/lab-samples/components/sample-label";
import { isPrintable } from "@/features/lab-samples/lib/samples";
import { requireLabMember } from "@/features/lab-staff/lib/lab-member.server";

export const metadata: Metadata = {
  title: "Sample labels",
};

// 2 x 1 inch thermal labels (CLSI AUTO12), one per page, with nothing else
// printed. Only on this page, while it's open.
const PRINT_STYLES = `
@page { size: 50.8mm 25.4mm; margin: 0; }
@media print {
  html, body { background: var(--label) !important; }
  main > * { padding: 0 !important; margin: 0 !important; max-width: none !important; }
  .label-page { break-after: page; }
  .label-page:last-child { break-after: auto; }
}
`;

// The booking's open sample labels, to print (LAB-16). Only reads: the codes
// are made by the Print labels action or when the sample is collected.
export default async function SampleLabelsPage({
  params,
}: PageProps<"/lab/bookings/[bookingId]/labels">) {
  const { bookingId } = await params;
  if (!z.uuid().safeParse(bookingId).success) notFound();

  const member = await requireLabMember("bookings.collect");
  const found = await getLabBooking(member.labId, bookingId);
  if (!found) notFound();
  const { booking, samples } = found;

  const open = samples.filter((sample) => sample.rejected_at === null);
  const printable = isPrintable(booking.status);

  return (
    <>
      <style>{PRINT_STYLES}</style>
      <div className="space-y-6 print:hidden">
        <BackLink href={labRoutes.booking(booking.id)}>Booking</BackLink>
        <DashboardPageHeader
          title="Sample labels"
          description="One label per tube or container. Label each one in front of the patient, straight after collection. In the print dialog, choose the label printer and turn off scaling or fit to page."
          actions={open.length > 0 && printable ? <PrintButton /> : undefined}
        />
      </div>
      {open.length > 0 && printable ? (
        <div className="flex flex-wrap gap-4 print:block">
          {open.map((sample) => (
            <div
              key={sample.code}
              className="label-page w-fit rounded-sm shadow-sm ring-1 ring-border print:rounded-none print:shadow-none print:ring-0"
            >
              <SampleLabel booking={booking} sample={sample} />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border bg-card p-5 text-sm print:hidden">
          <p className="text-muted-foreground">
            {printable
              ? "This booking has no sample codes yet."
              : "Labels can't be printed for a finished or cancelled booking."}
          </p>
          {printable && <PrintLabelsButton bookingId={booking.id} />}
        </div>
      )}
    </>
  );
}
