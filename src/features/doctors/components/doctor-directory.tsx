import { DoctorSearchBar } from "@/components/shared/doctor-search-bar";
import { specializations } from "@/features/auth/data/registration-options";
import { DoctorFilters } from "@/features/doctors/components/doctor-filters";
import { DoctorList } from "@/features/doctors/components/doctor-list";
import { DoctorsPagination } from "@/features/doctors/components/doctors-pagination";
import {
  searchDoctors,
  type DoctorSearch,
} from "@/features/doctors/data/doctor-directory";

type DoctorDirectoryProps = {
  searchAction: string;
  search: DoctorSearch;
};

export async function DoctorDirectory({
  searchAction,
  search,
}: DoctorDirectoryProps) {
  const { doctors, total, totalPages } = await searchDoctors(search);

  return (
    <div className="space-y-8">
      <DoctorSearchBar
        specialties={specializations}
        action={searchAction}
        defaultValues={{ q: search.q, specialty: search.specialty }}
        keep={{ gender: search.gender, city: search.city }}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <DoctorFilters action={searchAction} search={search} />
        <div>
          <DoctorList
            doctors={doctors}
            total={total}
            resetHref={searchAction}
          />
          <DoctorsPagination
            basePath={searchAction}
            search={search}
            totalPages={totalPages}
          />
        </div>
      </div>
    </div>
  );
}
