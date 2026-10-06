import {
  CalendarCheckIcon,
  FileTextIcon,
  PillIcon,
  type LucideIcon,
} from "lucide-react";

export type Feature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export const features: Feature[] = [
  {
    title: "Appointments",
    description: "Find a doctor and book a visit in a few clicks.",
    icon: CalendarCheckIcon,
  },
  {
    title: "Prescriptions",
    description: "Track active medication and request refills.",
    icon: PillIcon,
  },
  {
    title: "Health records",
    description: "Keep lab results and visit notes organised and secure.",
    icon: FileTextIcon,
  },
];
