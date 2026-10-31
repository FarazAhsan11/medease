import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { PreviewNotice } from "@/components/shared/preview-notice";
import { PageHeader } from "@/components/shared/page-header";
import { MedicineStore } from "@/features/medicines/components/medicine-store";

export const metadata: Metadata = {
  title: "Order Medicines",
};

export default function MedicinesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Pharmacy"
        title="Medicines"
        description="A look at what ordering medicines on MedEase will be like."
      />
      <Container className="space-y-8 py-8">
        <PreviewNotice feature="Ordering medicines" />
        <MedicineStore guest />
      </Container>
    </>
  );
}
