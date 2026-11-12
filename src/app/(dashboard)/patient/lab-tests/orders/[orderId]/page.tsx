import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { BackLink } from "@/components/shared/back-link";
import { buttonVariants } from "@/components/ui/button";
import { patientRoutes } from "@/config/routes";
import { LabOrderCard } from "@/features/lab-orders/components/lab-order-card";
import { LabOrderOfferList } from "@/features/lab-orders/components/lab-order-offer-list";
import { OrderBookingsList } from "@/features/lab-orders/components/order-bookings-list";
import {
  getLabOrder,
  getLabOrderOffers,
  getOrderBookings,
} from "@/features/lab-orders/data/lab-orders";
import { remainingTests } from "@/features/lab-orders/lib/lab-orders";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Book your doctor's tests",
};

export default async function PatientLabOrderPage({
  params,
}: PageProps<"/patient/lab-tests/orders/[orderId]">) {
  const [{ orderId }] = await Promise.all([params, requireRole("patient")]);
  if (!z.uuid().safeParse(orderId).success) notFound();

  const [order, offers, bookings] = await Promise.all([
    getLabOrder(orderId),
    getLabOrderOffers(orderId),
    getOrderBookings([orderId]),
  ]);
  if (!order) notFound();
  const toBook = remainingTests(order, bookings);

  return (
    <>
      <BackLink href={patientRoutes.labTests}>Back to lab tests</BackLink>
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
        <LabOrderCard order={order} showBookLink={false} />
        <div className="grid min-w-0 gap-6">
          <OrderBookingsList order={order} bookings={bookings} />
          {order.status !== "active" ? (
            <p className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
              Your doctor cancelled this order, so there&apos;s nothing to book.
            </p>
          ) : toBook.length > 0 ? (
            <LabOrderOfferList
              orderId={order.id}
              tests={toBook}
              offers={offers}
            />
          ) : (
            <div className="grid gap-3 rounded-2xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">
                Every test your doctor ordered is booked.
              </p>
              <Link
                href={patientRoutes.labTests}
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "w-fit",
                })}
              >
                See your bookings
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
