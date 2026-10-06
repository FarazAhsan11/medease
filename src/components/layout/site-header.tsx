import { HeartPulseIcon } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { siteConfig } from "@/config/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <Container className="flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <HeartPulseIcon className="size-5 text-primary" aria-hidden />
          {siteConfig.name}
        </Link>
        <ThemeToggle />
      </Container>
    </header>
  );
}
