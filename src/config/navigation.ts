export type NavItem = {
  title: string;
  href: string;
  desktopOnly?: boolean;
};

export const mainNav: NavItem[] = [
  { title: "Home", href: "/" },
  { title: "Dashboard", href: "/doctor/dashboard", desktopOnly: true },
  { title: "Appointments", href: "/appointments" },
  { title: "Find a Doctor", href: "/find-doctor" },
  { title: "Talk to AI", href: "/talk-to-ai" },
  { title: "Contact Us", href: "/contact" },
  { title: "About Us", href: "/about" },
];

export const footerNav = [
  { title: "Company", links: ["About", "Contact", "What's New"] },
  { title: "Support", links: ["Help Topics", "FAQs", "Report Violation"] },
  { title: "Legal", links: ["Privacy Policy", "Terms & Conditions"] },
];
