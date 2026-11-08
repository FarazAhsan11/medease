import { PaginationLinks } from "@/components/shared/pagination-links";
import type { DoctorSearch } from "@/features/doctors/data/doctor-directory";

type DoctorsPaginationProps = {
  basePath: string;
  search: DoctorSearch;
  totalPages: number;
};

export function DoctorsPagination({
  basePath,
  search,
  totalPages,
}: DoctorsPaginationProps) {
  return (
    <PaginationLinks
      basePath={basePath}
      params={{
        q: search.q,
        specialty: search.specialty,
        gender: search.gender,
        city: search.city,
      }}
      page={search.page}
      totalPages={totalPages}
    />
  );
}
