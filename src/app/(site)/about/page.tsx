import type { Metadata } from "next";

import { CtaBanner } from "@/components/shared/cta-banner";
import { AboutHero } from "@/features/about/components/about-hero";
import { FeaturesSection } from "@/features/about/components/features-section";
import { MissionSection } from "@/features/about/components/mission-section";

export const metadata: Metadata = {
  title: "About Us",
};

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <MissionSection />
      <FeaturesSection />
      <CtaBanner
        title="Ready to simplify your healthcare journey?"
        description="Find a verified doctor, book a visit and keep your prescriptions in one place."
        primary={{ label: "Create a free account", href: "/register" }}
        secondary={{ label: "Contact us", href: "/contact" }}
      />
    </>
  );
}
