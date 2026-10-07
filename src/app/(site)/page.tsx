import { CtaBanner } from "@/components/shared/cta-banner";
import { FaqSection } from "@/features/home/components/faq-section";
import { Hero } from "@/features/home/components/hero";
import { SearchSection } from "@/features/home/components/search-section";
import { ServicesSection } from "@/features/home/components/services-section";
import { WhyChooseUs } from "@/features/home/components/why-choose-us";

export default function HomePage() {
  return (
    <>
      <Hero />
      <SearchSection />
      <ServicesSection />
      <WhyChooseUs />
      <FaqSection />
      <CtaBanner
        title="Feeling unwell? Get guidance in minutes"
        description="Chat with our AI assistant to understand your symptoms, then book the right specialist in a few clicks."
        primary={{ label: "Talk to AI", href: "/talk-to-ai" }}
        secondary={{ label: "Browse doctors", href: "/find-doctor" }}
      />
    </>
  );
}
