import {
  BotIcon,
  FlaskConicalIcon,
  HouseIcon,
  InfoIcon,
  MailIcon,
  ShoppingBagIcon,
  StethoscopeIcon,
  type LucideIcon,
} from "lucide-react";

import { dashboards, type DashboardRole } from "@/config/dashboards";

export type NavItem = {
  title: string;
  href: string;
  icon?: LucideIcon;
};

export const mainNav: NavItem[] = [
  { title: "Home", href: "/", icon: HouseIcon },
  { title: "Find a Doctor", href: "/find-doctor", icon: StethoscopeIcon },
  { title: "Lab Tests", href: "/lab-tests", icon: FlaskConicalIcon },
  { title: "Medicines", href: "/medicines", icon: ShoppingBagIcon },
  { title: "Talk to AI", href: "/talk-to-ai", icon: BotIcon },
  { title: "About", href: "/about", icon: InfoIcon },
  { title: "Contact", href: "/contact", icon: MailIcon },
];

// Header links for the signed-in role, or the public links for guests.
export function getHeaderNav(role: DashboardRole | null) {
  if (!role) return { links: mainNav, more: [] };

  const { nav, moreNav } = dashboards[role];
  return { links: nav, more: moreNav };
}

export const footerNav: { title: string; links: NavItem[] }[] = [
  {
    title: "Services",
    links: [
      { title: "Find a doctor", href: "/find-doctor" },
      { title: "Book a lab test", href: "/lab-tests" },
      { title: "Order medicines", href: "/medicines" },
      { title: "Talk to AI", href: "/talk-to-ai" },
    ],
  },
  {
    title: "For partners",
    links: [
      { title: "Join as a doctor", href: "/register/doctor" },
      { title: "Register your lab", href: "/register/lab" },
      { title: "Doctor login", href: "/login/doctor" },
      { title: "Lab login", href: "/login/lab" },
    ],
  },
  {
    title: "Company",
    links: [
      { title: "About", href: "/about" },
      { title: "Contact", href: "/contact" },
      { title: "FAQs", href: "/#faq" },
      { title: "Privacy Policy", href: "#" },
    ],
  },
];

// Signed-in users get a slim footer without the marketing links.
export const compactFooterNav: NavItem[] = [
  { title: "About", href: "/about" },
  { title: "Contact", href: "/contact" },
  { title: "Privacy Policy", href: "#" },
];
