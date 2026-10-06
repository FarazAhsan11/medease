import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { TestimonialCard } from "@/features/about/components/testimonial-card";
import { aboutTestimonials } from "@/features/about/data/about-content";

export function TestimonialsSection() {
  return (
    <section className="pt-16">
      <Container>
        <SectionHeading
          eyebrow="Testimonials"
          title="What our users say"
          align="center"
        />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {aboutTestimonials.map((testimonial) => (
            <TestimonialCard
              key={testimonial.author}
              testimonial={testimonial}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
