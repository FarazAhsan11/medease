import { ClockIcon, PhoneIcon, type LucideIcon } from "lucide-react";

import { siteConfig } from "@/config/site";
import { telHref } from "@/lib/format";

export type ContactInfo = {
  icon: LucideIcon;
  label: string;
  value: string;
  href?: string;
};

export const contactInfo: ContactInfo[] = [
  {
    icon: PhoneIcon,
    label: "Phone",
    value: siteConfig.contact.phone,
    href: telHref(siteConfig.contact.phone),
  },
  {
    icon: ClockIcon,
    label: "Support hours",
    value: "Monday – Saturday, 9 AM to 6 PM",
  },
];
