import { AboutSectionTitle } from "@/features/about/components/about-section-title";
import { AboutTestimonialCard } from "@/features/about/components/about-testimonial-card";
import { aboutTestimonials } from "@/features/about/data/about-content";

export function TestimonialsSection() {
  return (
    <section className="bg-surface px-[140px] py-[30px] text-start max-lg:p-5">
      <AboutSectionTitle>What Our Users Say</AboutSectionTitle>
      <div className="flex flex-wrap justify-center gap-5 max-[480px]:items-center max-lg:flex-col max-lg:gap-[15px]">
        {aboutTestimonials.map((testimonial) => (
          <AboutTestimonialCard
            key={testimonial.author}
            testimonial={testimonial}
          />
        ))}
      </div>
    </section>
  );
}
