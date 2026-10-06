import Link from "next/link";

import { Container } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CtaBannerProps = {
  title: string;
  description: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
};

export function CtaBanner({
  title,
  description,
  primary,
  secondary,
}: CtaBannerProps) {
  return (
    <section className="py-16">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground sm:px-12">
          <div
            aria-hidden
            className="absolute -top-24 -right-24 size-72 rounded-full bg-white/10"
          />
          <div
            aria-hidden
            className="absolute -bottom-32 -left-16 size-72 rounded-full bg-white/5"
          />
          <div className="relative mx-auto max-w-xl">
            <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
            <p className="mt-3 text-sm text-white/80 sm:text-base">
              {description}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href={primary.href}
                className={cn(
                  buttonVariants({ variant: "secondary", size: "lg" }),
                  "h-10 px-5",
                )}
              >
                {primary.label}
              </Link>
              {secondary && (
                <Link
                  href={secondary.href}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "lg" }),
                    "h-10 px-5 text-white hover:bg-white/10 hover:text-white",
                  )}
                >
                  {secondary.label}
                </Link>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
