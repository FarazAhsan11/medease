import { DoctorSearchBar } from "@/components/shared/doctor-search-bar";
import { DoctorFilters } from "@/features/doctors/components/doctor-filters";
import { DoctorList } from "@/features/doctors/components/doctor-list";
import { DoctorsPagination } from "@/features/doctors/components/doctors-pagination";
import {
  DOCTORS_PER_PAGE,
  doctors,
  specialties,
} from "@/features/doctors/data/doctors";

type DoctorDirectoryProps = {
  searchAction: string;
};

export function DoctorDirectory({ searchAction }: DoctorDirectoryProps) {
  const totalPages = Math.ceil(doctors.length / DOCTORS_PER_PAGE);

  return (
    <div className="space-y-8">
      <DoctorSearchBar specialties={specialties} action={searchAction} />
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <DoctorFilters />
        <div>
          <DoctorList
            doctors={doctors.slice(0, DOCTORS_PER_PAGE)}
            total={doctors.length}
          />
          <DoctorsPagination totalPages={totalPages} currentPage={1} />
        </div>
      </div>
    </div>
  );
}
