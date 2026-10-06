import { AboutFeatureCard } from "@/features/about/components/about-feature-card";
import { AboutSectionTitle } from "@/features/about/components/about-section-title";
import { aboutFeatures } from "@/features/about/data/about-content";

export function FeaturesSection() {
  return (
    <section className="px-[140px] py-5 max-lg:p-5">
      <AboutSectionTitle>What Makes Us Special</AboutSectionTitle>
      <div className="flex flex-wrap justify-center gap-5 max-lg:flex-col max-lg:gap-[15px]">
        {aboutFeatures.map((feature) => (
          <AboutFeatureCard key={feature.title} feature={feature} />
        ))}
      </div>
    </section>
  );
}
