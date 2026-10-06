import Image from "next/image";

import { Container } from "@/components/layout/container";

export function AboutHero() {
  return (
    <section className="bg-card">
      <Container className="grid items-center gap-10 py-12 lg:grid-cols-2 lg:py-16">
        <div>
          <p className="text-xs font-semibold tracking-wider text-primary uppercase">
            About us
          </p>
          <h1 className="mt-2 text-3xl leading-tight font-semibold sm:text-4xl">
            Healthcare that is easy, accessible, and stress-free
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
            MedEase is your one-stop platform for seamless healthcare. From
            booking appointments to managing lab tests and medical records,
            we&apos;ve got you covered.
          </p>
        </div>
        <div className="rounded-[2rem] bg-secondary p-6 sm:p-10">
          <Image
            src="/images/about-hero.svg"
            alt="People exercising together outdoors"
            width={750}
            height={500}
            priority
            className="h-auto w-full"
          />
        </div>
      </Container>
    </section>
  );
}
