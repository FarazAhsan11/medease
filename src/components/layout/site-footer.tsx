import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Logo } from "@/components/layout/logo";
import { EmergencyNotice } from "@/components/shared/emergency-notice";
import { compactFooterNav, footerNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";

type SiteFooterProps = {
  compact?: boolean;
};

export function SiteFooter({ compact = false }: SiteFooterProps) {
  if (compact) {
    return (
      <footer className="border-t">
        <Container className="flex flex-col gap-3 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-1">
            <EmergencyNotice />
            <p>
              &copy; {new Date().getFullYear()} {siteConfig.name}. Not a
              substitute for professional medical advice.
            </p>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {compactFooterNav.map((link) => (
              <li key={link.title}>
                <Link
                  href={link.href}
                  className="transition-colors hover:text-foreground"
                >
                  {link.title}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </footer>
    );
  }

  return (
    <footer className="bg-ink text-ink-foreground">
      <Container className="grid gap-10 py-12 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div className="max-w-xs space-y-4">
          <Logo inverted />
          <p className="text-sm leading-relaxed">{siteConfig.description}</p>
          <EmergencyNotice className="text-white" />
        </div>

        {footerNav.map((section) => (
          <div key={section.title}>
            <h3 className="text-sm font-semibold text-white">
              {section.title}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {section.links.map((link) => (
                <li key={link.title}>
                  <Link
                    href={link.href}
                    className="text-sm transition-colors hover:text-white"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>

      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-2 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {siteConfig.name}. All rights
            reserved.
          </p>
          <p>Not a substitute for professional medical advice.</p>
        </Container>
      </div>
    </footer>
  );
}
