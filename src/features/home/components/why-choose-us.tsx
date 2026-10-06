import Link from "next/link";

import { Container } from "@/components/layout/container";
import { IconTile } from "@/components/shared/icon-tile";
import { SectionHeading } from "@/components/shared/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { highlights } from "@/features/home/data/highlights";

export function WhyChooseUs() {
  return (
    <section className="border-y bg-card py-16 sm:py-20">
      <Container className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
        <div>
          <SectionHeading
            eyebrow="Why MedEase"
            title="Care that fits around your life"
            description="We combine smart technology with trusted doctors so you get the right care, faster, without the usual hassle."
          />
          <Link
            href="/about"
            className={buttonVariants({
              variant: "outline",
              className: "mt-6",
            })}
          >
            Learn more about us
          </Link>
        </div>

        <ul className="grid gap-4">
          {highlights.map((highlight) => (
            <li
              key={highlight.title}
              className="flex gap-4 rounded-2xl border bg-background p-5"
            >
              <IconTile icon={highlight.icon} tone="solid" />
              <div>
                <h3 className="text-base font-semibold">{highlight.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {highlight.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
