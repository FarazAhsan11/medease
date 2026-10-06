import { HighlightCard } from "@/features/home/components/highlight-card";
import { SectionHeading } from "@/features/home/components/section-heading";
import { highlights } from "@/features/home/data/highlights";

export function WhyChooseUs() {
  return (
    <section className="py-5">
      <SectionHeading eyebrow="About" title="Why You Choose Us" />
      <div className="mt-5 flex items-center justify-end max-nav:flex-col">
        {highlights.map((highlight) => (
          <HighlightCard key={highlight.title} highlight={highlight} />
        ))}
      </div>
    </section>
  );
}
