import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { ServiceCard } from "@/features/home/components/service-card";
import { services } from "@/features/home/data/services";

export function ServicesSection() {
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="Services"
          title="Everything you need for better care"
          description="From instant AI guidance to lab tests at home, MedEase brings your healthcare into one simple place."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <ServiceCard key={service.title} service={service} />
          ))}
        </div>
      </Container>
    </section>
  );
}
