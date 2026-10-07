import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { MedicineStore } from "@/features/medicines/components/medicine-store";

export const metadata: Metadata = {
  title: "Order medicines",
};

export default function PatientMedicinesPage() {
  return (
    <>
      <DashboardPageHeader
        title="Order medicines"
        description="Delivered to your door within 24 hours."
      />
      <MedicineStore />
    </>
  );
}
