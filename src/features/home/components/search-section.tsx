import { Container } from "@/components/layout/container";
import { DoctorSearchBar } from "@/components/shared/doctor-search-bar";
import { specializations } from "@/features/auth/data/registration-options";

export function SearchSection() {
  return (
    <section className="relative z-10 -mt-7">
      <Container>
        <DoctorSearchBar
          specialties={specializations}
          className="mx-auto max-w-3xl"
        />
      </Container>
    </section>
  );
}
