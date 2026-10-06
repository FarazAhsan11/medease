import { QuoteIcon } from "lucide-react";

import { UserAvatar } from "@/components/shared/user-avatar";
import type { AboutTestimonial } from "@/features/about/data/about-content";

type TestimonialCardProps = {
  testimonial: AboutTestimonial;
};

export function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <figure className="flex flex-col rounded-2xl border bg-card p-6">
      <QuoteIcon className="size-6 text-brand" aria-hidden />
      <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground/80">
        {testimonial.quote}
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-3">
        <UserAvatar name={testimonial.author} className="size-9" />
        <div>
          <p className="text-sm font-semibold">{testimonial.author}</p>
          <p className="text-xs text-muted-foreground">{testimonial.role}</p>
        </div>
      </figcaption>
    </figure>
  );
}
