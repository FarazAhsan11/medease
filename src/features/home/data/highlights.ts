export type Highlight = {
  icon: string;
  iconWidth: number;
  iconHeight: number;
  title: string;
  description: string;
};

export const highlights: Highlight[] = [
  {
    icon: "/images/why-ai.png",
    iconWidth: 56,
    iconHeight: 65,
    title: "AI Doctor Recommendations",
    description:
      "AI-powered recommendations to match you with the best specialists for your needs.",
  },
  {
    icon: "/images/why-home-sample.svg",
    iconWidth: 56,
    iconHeight: 57,
    title: "Home Sample Collection",
    description:
      "Convenient lab test services with samples collected directly from your home.At your door steps",
  },
  {
    icon: "/images/why-doctor-kit.png",
    iconWidth: 56,
    iconHeight: 57,
    title: "Secure Consultations",
    description:
      "Private and encrypted online consultations to keep your health data secure.",
  },
];
