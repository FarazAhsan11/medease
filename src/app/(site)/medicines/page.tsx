import { BadgeCheckIcon, RotateCcwIcon, TruckIcon } from "lucide-react";
import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { FeatureStrip } from "@/components/shared/feature-strip";
import { PageHeader } from "@/components/shared/page-header";
import { MedicineStore } from "@/features/medicines/components/medicine-store";

export const metadata: Metadata = {
  title: "Order Medicines",
};

const benefits = [
  {
    icon: TruckIcon,
    title: "Fast delivery",
    description: "At your door within 24 hours",
  },
  {
    icon: BadgeCheckIcon,
    title: "Genuine medicines",
    description: "Sourced from licensed pharmacies",
  },
  {
    icon: RotateCcwIcon,
    title: "Easy returns",
    description: "On unopened packs within 7 days",
  },
];

export default function MedicinesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Pharmacy"
        title="Order medicines online"
        description="Search over-the-counter essentials or upload a prescription and get it delivered to your doorstep."
      />
      <Container className="space-y-8 py-8">
        <FeatureStrip items={benefits} />
        <MedicineStore />
      </Container>
    </>
  );
}
