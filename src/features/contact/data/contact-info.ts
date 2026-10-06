import {
  ClockIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  type LucideIcon,
} from "lucide-react";

import { siteConfig } from "@/config/site";

export type ContactInfo = {
  icon: LucideIcon;
  label: string;
  value: string;
  href?: string;
};

export const contactInfo: ContactInfo[] = [
  {
    icon: MailIcon,
    label: "Email",
    value: siteConfig.contact.email,
    href: `mailto:${siteConfig.contact.email}`,
  },
  {
    icon: PhoneIcon,
    label: "Phone",
    value: siteConfig.contact.phone,
    href: `tel:${siteConfig.contact.phone.replace(/[^+\d]/g, "")}`,
  },
  {
    icon: MapPinIcon,
    label: "Headquarters",
    value: siteConfig.contact.address,
  },
  {
    icon: ClockIcon,
    label: "Support hours",
    value: "Monday – Saturday, 9 AM to 6 PM",
  },
];
