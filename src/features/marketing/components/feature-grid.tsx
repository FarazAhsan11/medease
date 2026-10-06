import { Container } from "@/components/layout/container";
import { FeatureCard } from "@/features/marketing/components/feature-card";
import { features } from "@/features/marketing/data/features";

export function FeatureGrid() {
  return (
    <section className="pb-24">
      <Container className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <FeatureCard key={feature.title} feature={feature} />
        ))}
      </Container>
    </section>
  );
}
