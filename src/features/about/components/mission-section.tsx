import { AboutSectionTitle } from "@/features/about/components/about-section-title";

export function MissionSection() {
  return (
    <section className="my-5 px-[140px] py-5 text-start max-lg:p-5">
      <AboutSectionTitle>Our Mission</AboutSectionTitle>
      <p className="my-[5px] text-ink-muted">
        To revolutionize healthcare by bridging the gap between patients and
        providers. We believe in a future where healthcare is easy, accessible,
        and stress-free.
      </p>
    </section>
  );
}
