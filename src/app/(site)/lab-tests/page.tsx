import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { PreviewNotice } from "@/components/shared/preview-notice";
import { PageHeader } from "@/components/shared/page-header";
import { LabTestDirectory } from "@/features/lab-tests/components/lab-test-directory";

export const metadata: Metadata = {
  title: "Lab Tests",
};

export default function LabTestsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Lab tests"
        title="Lab tests"
        description="A look at what booking lab tests on MedEase will be like."
      />
      <Container className="space-y-12 py-8">
        <PreviewNotice feature="Lab booking" />
        <LabTestDirectory />
      </Container>
    </>
  );
}
