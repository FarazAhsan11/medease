import { FileCheck2Icon, HouseIcon, ShieldCheckIcon } from "lucide-react";
import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { FeatureStrip } from "@/components/shared/feature-strip";
import { PageHeader } from "@/components/shared/page-header";
import { LabPackageCard } from "@/features/lab-tests/components/lab-package-card";
import { LabTestCatalog } from "@/features/lab-tests/components/lab-test-catalog";
import { labPackages, labTests } from "@/features/lab-tests/data/lab-tests";

export const metadata: Metadata = {
  title: "Lab Tests",
};

const benefits = [
  {
    icon: HouseIcon,
    title: "Free home collection",
    description: "A trained phlebotomist visits you",
  },
  {
    icon: FileCheck2Icon,
    title: "Digital reports",
    description: "Delivered to your dashboard",
  },
  {
    icon: ShieldCheckIcon,
    title: "Certified partner labs",
    description: "Quality-checked results",
  },
];

export default function LabTestsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Lab tests"
        title="Book lab tests from home"
        description="Choose a test or health package, pick a slot, and we'll collect your sample at your doorstep."
      />
      <Container className="space-y-12 py-8">
        <FeatureStrip items={benefits} />

        <section>
          <h2 className="text-lg font-semibold">Popular health packages</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {labPackages.map((labPackage, index) => (
              <LabPackageCard
                key={labPackage.id}
                labPackage={labPackage}
                featured={index === 0}
              />
            ))}
          </div>
        </section>

        <LabTestCatalog tests={labTests} />
      </Container>
    </>
  );
}
