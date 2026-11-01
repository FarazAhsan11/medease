import {
  BotIcon,
  FlaskConicalIcon,
  ShoppingBagIcon,
  StethoscopeIcon,
  type LucideIcon,
} from "lucide-react";

import { patientRoutes } from "@/config/routes";

export type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

export const quickActions: QuickAction[] = [
  {
    title: "Book a doctor",
    description: "Find a specialist",
    href: patientRoutes.findDoctor,
    icon: StethoscopeIcon,
  },
  {
    title: "Book a lab test",
    description: "Home collection",
    href: patientRoutes.bookLabTests,
    icon: FlaskConicalIcon,
  },
  {
    title: "Order medicines",
    description: "Delivered in 24h",
    href: patientRoutes.medicines,
    icon: ShoppingBagIcon,
  },
  {
    title: "Talk to AI",
    description: "Check symptoms",
    href: patientRoutes.talkToAi,
    icon: BotIcon,
  },
];
