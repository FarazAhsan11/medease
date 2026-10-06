import type { Metadata } from "next";

import { DoctorSearchBar } from "@/components/shared/doctor-search-bar";
import { DoctorFilters } from "@/features/doctors/components/doctor-filters";
import { DoctorList } from "@/features/doctors/components/doctor-list";
import { DoctorsPagination } from "@/features/doctors/components/doctors-pagination";
import {
  DOCTORS_PER_PAGE,
  doctorTypes,
  doctors,
} from "@/features/doctors/data/doctors";

export const metadata: Metadata = {
  title: "Find a Doctor",
};

const searchOptions = ["All Doctors", ...doctorTypes];

export default function FindDoctorPage() {
  const totalPages = Math.ceil(doctors.length / DOCTORS_PER_PAGE);

  return (
    <div className="flex flex-col gap-5 bg-surface p-5 max-[480px]:p-2">
      <header>
        <h1 className="my-[21px] text-[32px] font-bold">Find Your Doctor</h1>
        <p className="my-[5px] text-ink-muted">
          Browse our list of qualified medical professionals and book your
          appointment.
        </p>
      </header>

      <div className="flex justify-center">
        <DoctorSearchBar
          options={searchOptions}
          className="mb-5 px-5 py-2 shadow-raised max-[480px]:w-full max-[480px]:px-2 max-[480px]:py-[5px] max-md:px-2.5"
        />
      </div>

      <div className="flex max-md:flex-col">
        <DoctorFilters />
        <DoctorList doctors={doctors.slice(0, DOCTORS_PER_PAGE)} />
      </div>

      <DoctorsPagination totalPages={totalPages} currentPage={1} />
    </div>
  );
}
