export type NavItem = {
  title: string;
  href: string;
};

export const mainNav: NavItem[] = [
  { title: "Home", href: "/" },
  { title: "Find a Doctor", href: "/find-doctor" },
  { title: "Appointments", href: "/appointments" },
  { title: "Talk to AI", href: "/talk-to-ai" },
  { title: "Dashboard", href: "/doctor/dashboard" },
  { title: "About", href: "/about" },
  { title: "Contact", href: "/contact" },
];

export const footerNav: { title: string; links: NavItem[] }[] = [
  {
    title: "Company",
    links: [
      { title: "About", href: "/about" },
      { title: "Contact", href: "/contact" },
      { title: "What's New", href: "#" },
    ],
  },
  {
    title: "Support",
    links: [
      { title: "Help Topics", href: "#" },
      { title: "FAQs", href: "/#faq" },
      { title: "Report Violation", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { title: "Privacy Policy", href: "#" },
      { title: "Terms & Conditions", href: "#" },
    ],
  },
];
