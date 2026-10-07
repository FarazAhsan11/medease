import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/shared/page-header";
import { DoctorDirectory } from "@/features/doctors/components/doctor-directory";

export const metadata: Metadata = {
  title: "Find a Doctor",
};

export default function FindDoctorPage() {
  return (
    <>
      <PageHeader
        eyebrow="Doctors"
        title="Find your doctor"
        description="Browse qualified medical professionals and book an appointment that works for you."
      />
      <Container className="py-8">
        <DoctorDirectory searchAction="/find-doctor" />
      </Container>
    </>
  );
}
