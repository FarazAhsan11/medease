import type { AboutTestimonial } from "@/features/about/data/about-content";

type AboutTestimonialCardProps = {
  testimonial: AboutTestimonial;
};

export function AboutTestimonialCard({
  testimonial,
}: AboutTestimonialCardProps) {
  return (
    <figure className="max-w-[250px] rounded-lg bg-white p-[15px] shadow-testimonial">
      <blockquote className="my-[5px] text-ink-muted italic">
        &quot;{testimonial.quote}&quot;
      </blockquote>
      <figcaption className="my-[21px] font-bold text-ink-muted">
        - {testimonial.author}
      </figcaption>
    </figure>
  );
}
