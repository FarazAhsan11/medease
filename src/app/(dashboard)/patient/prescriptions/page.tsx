import { ShoppingBagIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { buttonVariants } from "@/components/ui/button";
import { patientRoutes } from "@/config/routes";
import { PatientPrescriptions } from "@/features/prescriptions/components/patient-prescriptions";
import { listPatientPrescriptions } from "@/features/prescriptions/data/prescriptions";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Prescriptions",
};

export default async function PatientPrescriptionsPage() {
  const user = await requireRole("patient");
  const prescriptions = await listPatientPrescriptions(user.id);

  return (
    <>
      <DashboardPageHeader
        title="Prescriptions"
        description="Medicines from your doctors, how to take them, and for how long."
        actions={
          <Link
            href={patientRoutes.medicines}
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
      <PatientPrescriptions prescriptions={prescriptions} />
    </>
  );
}
