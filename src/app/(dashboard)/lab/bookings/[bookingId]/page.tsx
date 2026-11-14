import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { BackLink } from "@/components/shared/back-link";
import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { labRoutes } from "@/config/routes";
import { LabBookingEntry } from "@/features/lab-booking/components/lab-booking-entry";
import { getLabBooking } from "@/features/lab-booking/data/lab-bookings";
import { getLabCollectors } from "@/features/lab-booking/data/lab-collectors";
import { BookingHistory } from "@/features/lab-samples/components/booking-history";
import { SampleList } from "@/features/lab-samples/components/sample-list";
import { getLabBookingHistory } from "@/features/lab-samples/data/lab-samples";
import {
  memberCan,
  requireLabMember,
} from "@/features/lab-staff/lib/lab-member.server";

export const metadata: Metadata = {
  title: "Booking",
};

// One lab booking: the booking, its sample codes and every step with who
// took it (LAB-16).
export default async function LabBookingPage({
  params,
}: PageProps<"/lab/bookings/[bookingId]">) {
  const { bookingId } = await params;
  if (!z.uuid().safeParse(bookingId).success) notFound();

  const member = await requireLabMember("bookings.view");
  const [found, history] = await Promise.all([
    getLabBooking(member.labId, bookingId),
    getLabBookingHistory(bookingId),
  ]);
  if (!found || !history) notFound();
  const { booking, samples } = found;

  const collectors =
    memberCan(member, "bookings.assign") && booking.collection === "home"
      ? await getLabCollectors([booking.visitDate])
      : undefined;

  return (
    <>
      <BackLink href={labRoutes.bookings}>Bookings</BackLink>
      <DashboardPageHeader
        title="Booking"
        description="Sample codes and every step of this booking, with who took it."
      />
      <LabBookingEntry
        booking={booking}
        role={member.role}
        viewerId={member.user.id}
        collectors={collectors}
        detailsLink={false}
      />
      <section className="space-y-3" aria-labelledby="samples-heading">
        <h2 id="samples-heading" className="text-base font-semibold">
          Samples
        </h2>
        <SampleList samples={samples} timezone={booking.timezone} />
      </section>
      <section className="space-y-3" aria-labelledby="history-heading">
        <h2 id="history-heading" className="text-base font-semibold">
          History
        </h2>
        <BookingHistory steps={history} timezone={booking.timezone} />
      </section>
    </>
  );
}
