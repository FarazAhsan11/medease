import {
  BotIcon,
  FlaskConicalIcon,
  PillIcon,
  StethoscopeIcon,
  type LucideIcon,
} from "lucide-react";

export type Service = {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
};

export const services: Service[] = [
  {
    icon: BotIcon,
    title: "AI Medical Assistant",
    description:
      "Describe your symptoms and get instant, personalized guidance on which specialist to see.",
    href: "/talk-to-ai",
  },
  {
    icon: StethoscopeIcon,
    title: "Find a Doctor",
    description:
      "Browse verified specialists and book a consultation at a time that suits you.",
    href: "/find-doctor",
  },
  {
    icon: FlaskConicalIcon,
    title: "Lab Test Booking",
    description:
      "Book lab tests online with home sample collection and fast, reliable results.",
    href: "/lab-tests",
  },
  {
    icon: PillIcon,
    title: "Order Medicines",
    description:
      "Order prescriptions online and get them delivered quickly to your doorstep.",
    href: "/medicines",
  },
];
