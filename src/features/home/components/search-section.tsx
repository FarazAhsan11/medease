import { Container } from "@/components/layout/container";
import { DoctorSearchBar } from "@/components/shared/doctor-search-bar";
import { specialties } from "@/features/doctors/data/doctors";

export function SearchSection() {
  return (
    <section className="relative z-10 -mt-7">
      <Container>
        <DoctorSearchBar
          specialties={specialties}
          className="mx-auto max-w-3xl"
        />
      </Container>
    </section>
  );
}
