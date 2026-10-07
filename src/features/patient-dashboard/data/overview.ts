import {
  BotIcon,
  CalendarDaysIcon,
  FileHeartIcon,
  FlaskConicalIcon,
  PillIcon,
  ShoppingBagIcon,
  StethoscopeIcon,
  type LucideIcon,
} from "lucide-react";

import type { Stat } from "@/components/shared/stat-card";

export type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

export const patientStats: Stat[] = [
  {
    label: "Upcoming visits",
    value: "2",
    hint: "Next on Fri, Oct 9",
    icon: CalendarDaysIcon,
  },
  {
    label: "Lab reports",
    value: "1 ready",
    hint: "1 still processing",
    icon: FlaskConicalIcon,
  },
  {
    label: "Active medicines",
    value: "3",
    hint: "1 refill due soon",
    icon: PillIcon,
  },
  {
    label: "Health records",
    value: "12",
    hint: "Last added Oct 5",
    icon: FileHeartIcon,
  },
];

export const quickActions: QuickAction[] = [
  {
    title: "Book a doctor",
    description: "Find a specialist",
    href: "/find-doctor",
    icon: StethoscopeIcon,
  },
  {
    title: "Book a lab test",
    description: "Home collection",
    href: "/lab-tests",
    icon: FlaskConicalIcon,
  },
  {
    title: "Order medicines",
    description: "Delivered in 24h",
    href: "/medicines",
    icon: ShoppingBagIcon,
  },
  {
    title: "Talk to AI",
    description: "Check symptoms",
    href: "/talk-to-ai",
    icon: BotIcon,
  },
];
