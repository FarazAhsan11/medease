export type NavItem = {
  title: string;
  href: string;
};

export const mainNav: NavItem[] = [
  { title: "Home", href: "/" },
  { title: "Find a Doctor", href: "/find-doctor" },
  { title: "Lab Tests", href: "/lab-tests" },
  { title: "Medicines", href: "/medicines" },
  { title: "Talk to AI", href: "/talk-to-ai" },
  { title: "About", href: "/about" },
  { title: "Contact", href: "/contact" },
];

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
