import { Container } from "@/components/layout/container";
import { IconTile } from "@/components/shared/icon-tile";
import { SectionHeading } from "@/components/shared/section-heading";
import { aboutFeatures } from "@/features/about/data/about-content";

export function FeaturesSection() {
  return (
    <section className="border-y bg-card py-16">
      <Container>
        <SectionHeading
          eyebrow="What makes us special"
          title="Built around the way you manage your health"
          align="center"
        />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {aboutFeatures.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border bg-background p-6"
            >
              <IconTile icon={feature.icon} size="lg" />
              <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
