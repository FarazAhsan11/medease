import Link from "next/link";

import {
  FacebookIcon,
  InstagramIcon,
  TwitterIcon,
} from "@/components/icons/social-icons";
import { Container } from "@/components/layout/container";
import { Logo } from "@/components/layout/logo";
import { footerNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";

const socialLinks = [
  { label: "Facebook", icon: FacebookIcon },
  { label: "Twitter", icon: TwitterIcon },
  { label: "Instagram", icon: InstagramIcon },
];

export function SiteFooter() {
  return (
    <footer className="bg-ink text-ink-foreground">
      <Container className="grid gap-10 py-12 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div className="max-w-xs space-y-4">
          <Logo inverted />
          <p className="text-sm leading-relaxed">{siteConfig.description}</p>
          <div className="flex gap-3">
            {socialLinks.map(({ label, icon: Icon }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="flex size-8 items-center justify-center rounded-full bg-white/5 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Icon className="size-3.5" />
              </a>
            ))}
          </div>
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
          <p>&copy; 2024 {siteConfig.name}. All rights reserved.</p>
          <p>Not a substitute for professional medical advice.</p>
        </Container>
      </div>
    </footer>
  );
}
