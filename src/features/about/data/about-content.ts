import {
  CalendarCheckIcon,
  ClockIcon,
  FileHeartIcon,
  FlaskConicalIcon,
  ShieldCheckIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react";

export type AboutItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const values: AboutItem[] = [
  {
    icon: SparklesIcon,
    title: "AI guidance",
    description: "Symptom checks and specialist suggestions, any time.",
  },
  {
    icon: ClockIcon,
    title: "On your schedule",
    description: "Each doctor publishes their own hours.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Private by design",
    description: "Your records are visible only to you and your doctors.",
  },
];

export const aboutFeatures: AboutItem[] = [
  {
    icon: CalendarCheckIcon,
    title: "Instant appointments",
    description:
      "Book consultations with leading healthcare professionals in just a few clicks.",
  },
  {
    icon: FileHeartIcon,
    title: "Digital health records",
    description:
      "Access your medical history anytime, anywhere, securely stored on our platform.",
  },
  {
    icon: FlaskConicalIcon,
    title: "Lab test bookings",
    description:
      "Conveniently book lab tests and receive results directly through your account.",
  },
];
