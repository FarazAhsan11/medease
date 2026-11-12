import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { BackLink } from "@/components/shared/back-link";
import { patientRoutes } from "@/config/routes";
import { LabOrderCard } from "@/features/lab-orders/components/lab-order-card";
import { LabOrderOfferList } from "@/features/lab-orders/components/lab-order-offer-list";
import {
  getLabOrder,
  getLabOrderOffers,
} from "@/features/lab-orders/data/lab-orders";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Book your doctor's tests",
};

export default async function PatientLabOrderPage({
  params,
}: PageProps<"/patient/lab-tests/orders/[orderId]">) {
  const [{ orderId }] = await Promise.all([params, requireRole("patient")]);
  if (!z.uuid().safeParse(orderId).success) notFound();

  const [order, offers] = await Promise.all([
    getLabOrder(orderId),
    getLabOrderOffers(orderId),
  ]);
  if (!order) notFound();

  return (
    <>
      <BackLink href={patientRoutes.labTests}>Back to lab tests</BackLink>
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
        <LabOrderCard order={order} showBookLink={false} />
        {order.status === "active" ? (
          <LabOrderOfferList
            orderId={order.id}
            tests={order.tests}
            offers={offers}
          />
        ) : (
          <p className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
            Your doctor cancelled this order, so there&apos;s nothing to book.
          </p>
        )}
      </div>
    </>
  );
}
