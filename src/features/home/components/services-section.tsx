import { SectionHeading } from "@/features/home/components/section-heading";
import { ServiceCard } from "@/features/home/components/service-card";
import { services } from "@/features/home/data/services";

export function ServicesSection() {
  return (
    <section className="mt-6 text-start max-nav:flex max-nav:w-full max-nav:flex-col">
      <SectionHeading eyebrow="Services" title="Our Services" />
      <div className="grid grid-cols-2 gap-5 max-nav:flex max-nav:flex-col max-nav:items-center">
        {services.map((service) => (
          <ServiceCard key={service.title} service={service} />
        ))}
      </div>
    </section>
  );
}
