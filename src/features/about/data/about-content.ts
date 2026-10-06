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

export type AboutTestimonial = {
  quote: string;
  author: string;
  role: string;
};

export const values: AboutItem[] = [
  {
    icon: SparklesIcon,
    title: "AI guidance",
    description: "Symptom checks and specialist suggestions, any time.",
  },
  {
    icon: ClockIcon,
    title: "Mon – Sat",
    description: "Consultations available from 11 AM to 4 PM.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Private by design",
    description: "Encrypted records you control.",
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

export const aboutTestimonials: AboutTestimonial[] = [
  {
    quote:
      "MedEase has made managing my health so much easier. The appointment booking system is a lifesaver!",
    author: "Sarah W.",
    role: "Patient since 2023",
  },
  {
    quote:
      "The lab services are quick and reliable. I love having all my results in one place.",
    author: "James L.",
    role: "Patient since 2024",
  },
  {
    quote:
      "The digital records feature has been a game-changer for me. No more worrying about misplaced files!",
    author: "Emily R.",
    role: "Patient since 2022",
  },
];
