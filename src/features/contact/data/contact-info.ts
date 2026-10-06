export type ContactInfo = {
  icon: string;
  label: string;
  value: string;
};

export const contactInfo: ContactInfo[] = [
  {
    icon: "/images/contact-email.svg",
    label: "Email",
    value: "info@xpertflow.com",
  },
  {
    icon: "/images/contact-phone.svg",
    label: "Phone",
    value: "+92-51 889 6991",
  },
  {
    icon: "/images/contact-map.svg",
    label: "Location",
    value:
      "Headquarters: XpertFlow, 39 Prince George's Park, BLK14/GSA, #12-37, S118431, Singapore.",
  },
];
