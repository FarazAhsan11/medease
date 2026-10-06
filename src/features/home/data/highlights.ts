import {
  HouseIcon,
  ShieldCheckIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react";

export type Highlight = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const highlights: Highlight[] = [
  {
    icon: SparklesIcon,
    title: "AI doctor recommendations",
    description:
      "Our assistant matches you with the right specialist based on your symptoms and needs.",
  },
  {
    icon: HouseIcon,
    title: "Home sample collection",
    description:
      "Skip the waiting room. A technician collects lab samples directly from your home.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Secure consultations",
    description:
      "Private, encrypted video consultations keep your health information safe.",
  },
];
