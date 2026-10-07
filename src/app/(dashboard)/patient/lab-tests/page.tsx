import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { buttonVariants } from "@/components/ui/button";
import { patientRoutes } from "@/config/routes";
import { LabOrderCard } from "@/features/lab-tests/components/lab-order-card";
import { labOrders } from "@/features/lab-tests/data/lab-orders";

export const metadata: Metadata = {
  title: "Lab tests",
};

export default function PatientLabTestsPage() {
  return (
    <>
      <DashboardPageHeader
        title="Lab tests"
        description="Track your bookings and download reports when they're ready."
        actions={
          <Link
            href={patientRoutes.bookLabTests}
            className={buttonVariants({ className: "h-9 gap-1.5 px-4" })}
          >
            <PlusIcon aria-hidden />
            Book a test
          </Link>
        }
      />
      <div className="grid gap-4">
        {labOrders.map((order) => (
          <LabOrderCard key={order.id} order={order} />
        ))}
      </div>
    </>
  );
}
