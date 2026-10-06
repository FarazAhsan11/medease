import type { Metadata } from "next";

import { AboutFooter } from "@/features/about/components/about-footer";
import { AboutHero } from "@/features/about/components/about-hero";
import { CtaSection } from "@/features/about/components/cta-section";
import { FeaturesSection } from "@/features/about/components/features-section";
import { MissionSection } from "@/features/about/components/mission-section";
import { TestimonialsSection } from "@/features/about/components/testimonials-section";

export const metadata: Metadata = {
  title: "About Us",
};

export default function AboutPage() {
  return (
    <div className="bg-surface">
      <AboutHero />
      <MissionSection />
      <FeaturesSection />
      <TestimonialsSection />
      <CtaSection />
      <AboutFooter />
    </div>
  );
}
