import type { Metadata } from "next";

import { PreviewNotice } from "@/components/shared/preview-notice";
import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { MedicineStore } from "@/features/medicines/components/medicine-store";

export const metadata: Metadata = {
  title: "Order medicines",
};

export default function PatientMedicinesPage() {
  return (
    <>
      <PreviewNotice feature="Ordering medicines" />
      <DashboardPageHeader
        title="Order medicines"
        description="Browse sample medicines."
      />
      <MedicineStore />
    </>
  );
}
