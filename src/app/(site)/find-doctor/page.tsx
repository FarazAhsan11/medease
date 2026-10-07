import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { DoctorSearchBar } from "@/components/shared/doctor-search-bar";
import { PageHeader } from "@/components/shared/page-header";
import { DoctorFilters } from "@/features/doctors/components/doctor-filters";
import { DoctorList } from "@/features/doctors/components/doctor-list";
import { DoctorsPagination } from "@/features/doctors/components/doctors-pagination";
import {
  DOCTORS_PER_PAGE,
  doctors,
  specialties,
} from "@/features/doctors/data/doctors";

export const metadata: Metadata = {
  title: "Find a Doctor",
};

export default function FindDoctorPage() {
  const totalPages = Math.ceil(doctors.length / DOCTORS_PER_PAGE);

  return (
    <>
      <PageHeader
        eyebrow="Doctors"
        title="Find your doctor"
        description="Browse qualified medical professionals and book an appointment that works for you."
      />
      <Container className="py-8">
        <DoctorSearchBar specialties={specialties} />
        <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
          <DoctorFilters />
          <div>
            <DoctorList
              doctors={doctors.slice(0, DOCTORS_PER_PAGE)}
              total={doctors.length}
            />
            <DoctorsPagination totalPages={totalPages} currentPage={1} />
          </div>
        </div>
      </Container>
    </>
  );
}
