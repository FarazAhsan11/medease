import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/shared/page-header";
import { DoctorDirectory } from "@/features/doctors/components/doctor-directory";
import { parseDoctorSearch } from "@/features/doctors/data/doctor-directory";

export const metadata: Metadata = {
  title: "Find a Doctor",
};

export default async function FindDoctorPage({
  searchParams,
}: PageProps<"/find-doctor">) {
  const search = parseDoctorSearch(await searchParams);

  return (
    <>
      <PageHeader
        eyebrow="Doctors"
        title="Find your doctor"
        description="Browse qualified medical professionals and book an appointment that works for you."
      />
      <Container className="py-8">
        <DoctorDirectory searchAction="/find-doctor" search={search} />
      </Container>
    </>
  );
}
