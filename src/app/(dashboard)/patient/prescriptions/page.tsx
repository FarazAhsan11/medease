import { ShoppingBagIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { buttonVariants } from "@/components/ui/button";
import { PrescriptionCard } from "@/features/prescriptions/components/prescription-card";
import { prescriptions } from "@/features/prescriptions/data/prescriptions";

export const metadata: Metadata = {
  title: "Prescriptions",
};

export default function PatientPrescriptionsPage() {
  return (
    <>
      <DashboardPageHeader
        title="Prescriptions"
        description="Your active medicines, dosing schedule, and refills."
        actions={
          <Link
            href="/medicines"
            className={buttonVariants({
              variant: "outline",
              className: "h-9 gap-1.5 px-4",
            })}
          >
            <ShoppingBagIcon aria-hidden />
            Order medicines
          </Link>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {prescriptions.map((prescription) => (
          <PrescriptionCard key={prescription.id} prescription={prescription} />
        ))}
      </div>
    </>
  );
}
