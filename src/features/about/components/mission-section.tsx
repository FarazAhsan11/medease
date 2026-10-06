import { Container } from "@/components/layout/container";
import { IconTile } from "@/components/shared/icon-tile";
import { values } from "@/features/about/data/about-content";

export function MissionSection() {
  return (
    <section className="py-16">
      <Container className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold tracking-wider text-primary uppercase">
            Our mission
          </p>
          <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
            Bridging the gap between patients and providers
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            We want to revolutionize healthcare by making every step simpler,
            from understanding your symptoms to seeing the right doctor and
            keeping track of your results. We believe in a future where care is
            easy, accessible, and stress-free.
          </p>
        </div>
        <ul className="grid gap-3">
          {values.map((value) => (
            <li
              key={value.title}
              className="flex items-center gap-4 rounded-2xl border bg-card p-4"
            >
              <IconTile icon={value.icon} />
              <div>
                <p className="text-sm font-semibold">{value.title}</p>
                <p className="text-sm text-muted-foreground">
                  {value.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
