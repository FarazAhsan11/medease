import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { BackLink } from "@/components/shared/back-link";
import { patientRoutes } from "@/config/routes";
import { LabBookingCard } from "@/features/lab-booking/components/lab-booking-card";
import { getPatientLabBooking } from "@/features/lab-booking/data/lab-bookings";
import { LabBookingLiveRefresh } from "@/features/payments/components/lab-booking-live-refresh";
import { LabBookingPaymentStatus } from "@/features/payments/components/lab-booking-payment-status";
import { getLatestLabPayment } from "@/features/payments/data/payments";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Lab booking payment",
};

// Where the checkout sends the patient back, and "Pay now" for a held
// booking (PAY-07). Shows what the webhook decided, live.
export default async function LabBookingPaymentPage({
  params,
}: PageProps<"/patient/lab-tests/bookings/[id]/payment">) {
  const [{ id }, user] = await Promise.all([params, requireRole("patient")]);
  if (!z.uuid().safeParse(id).success) notFound();

  const [booking, attempt] = await Promise.all([
    getPatientLabBooking(user.id, id),
    getLatestLabPayment(id),
  ]);
  if (!booking) notFound();

  return (
    <>
      <BackLink href={patientRoutes.labTests}>Back to lab tests</BackLink>
      <div className="mx-auto grid w-full max-w-2xl gap-6">
        <LabBookingPaymentStatus
          booking={booking}
          attempt={attempt?.status ?? null}
        />
        <LabBookingCard booking={booking} actions={false} />
      </div>
      <LabBookingLiveRefresh userId={user.id} bookingId={booking.id} />
    </>
  );
}
