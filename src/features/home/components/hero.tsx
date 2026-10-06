import { BotIcon, CheckCircle2Icon, SparklesIcon } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { HeroVisual } from "@/features/home/components/hero-visual";
import { cn } from "@/lib/utils";

const trustPoints = [
  "Verified specialists",
  "Home sample collection",
  "Secure consultations",
];

export function Hero() {
  return (
    <section className="overflow-hidden bg-card">
      <Container className="grid items-center gap-12 py-12 lg:grid-cols-[1.1fr_1fr] lg:py-20">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <SparklesIcon className="size-3.5" aria-hidden />
            AI-powered healthcare
          </span>
          <h1 className="mt-5 text-4xl leading-tight font-semibold sm:text-5xl">
            Your one-stop solution for{" "}
            <span className="text-primary">medical assistance</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
            {siteConfig.description}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/talk-to-ai"
              className={cn(buttonVariants({ size: "lg" }), "h-10 gap-2 px-5")}
            >
              <BotIcon aria-hidden />
              Talk to AI
            </Link>
            <Link
              href="/find-doctor"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-10 px-5",
              )}
            >
              Find a doctor
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
            {trustPoints.map((point) => (
              <li
                key={point}
                className="flex items-center gap-1.5 text-sm text-muted-foreground"
              >
                <CheckCircle2Icon className="size-4 text-success" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <HeroVisual />
      </Container>
    </section>
  );
}
