import { CalendarXIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { BackLink } from "@/components/shared/back-link";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { patientRoutes } from "@/config/routes";
import { BookingChangeSummary } from "@/features/lab-booking/components/booking-change-summary";
import { RescheduleLabBookingForm } from "@/features/lab-booking/components/reschedule-lab-booking-form";
import {
  getCollectionDays,
  getVisitDays,
} from "@/features/lab-booking/data/booking-options";
import { getPatientLabBooking } from "@/features/lab-booking/data/lab-bookings";
import { canReschedule } from "@/features/lab-booking/lib/lab-bookings";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Change lab booking time",
};

export default async function RescheduleLabBookingPage({
  params,
}: PageProps<"/patient/lab-tests/bookings/[id]/reschedule">) {
  const [{ id }, user] = await Promise.all([params, requireRole("patient")]);
  if (!z.uuid().safeParse(id).success) notFound();

  const booking = await getPatientLabBooking(user.id, id);
  if (!booking) notFound();

  const back = (
    <BackLink href={patientRoutes.labTests}>Back to lab tests</BackLink>
  );

  if (!canReschedule(booking)) {
    return (
      <>
        {back}
        <EmptyState
          icon={CalendarXIcon}
          title="This booking can't be moved here"
          description="The sample has been taken, the booking is closed, or it has been moved as many times as allowed. Call the lab to change it."
          action={
            <Link href={patientRoutes.labTests} className={buttonVariants()}>
              Back to lab tests
            </Link>
          }
        />
      </>
    );
  }

  const home = booking.collection === "home";
  const collectionDays = home ? await getCollectionDays(booking.labId) : [];

  return (
    <>
      {back}
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <BookingChangeSummary booking={booking} />
        <RescheduleLabBookingForm
          bookingId={booking.id}
          collection={booking.collection}
          currentDate={booking.visitDate}
          currentSlot={
            booking.slotStartsAt
              ? new Date(booking.slotStartsAt).toISOString()
              : null
          }
          visitDays={home ? [] : getVisitDays()}
          collectionDays={collectionDays}
        />
      </div>
    </>
  );
}
