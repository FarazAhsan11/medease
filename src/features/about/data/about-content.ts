export type AboutFeature = {
  icon: string;
  title: string;
  description: string;
};

export type AboutTestimonial = {
  quote: string;
  author: string;
};

export const aboutFeatures: AboutFeature[] = [
  {
    icon: "/images/about-calendar.svg",
    title: "Instant Appointments",
    description:
      "Book consultations with leading healthcare professionals in just a few clicks.",
  },
  {
    icon: "/images/about-records.svg",
    title: "Digital Health Records",
    description:
      "Access your medical history anytime, anywhere, securely stored on our platform.",
  },
  {
    icon: "/images/about-lab.svg",
    title: "Lab Test Bookings",
    description:
      "Conveniently book lab tests and receive results directly through your account.",
  },
];

export const aboutTestimonials: AboutTestimonial[] = [
  {
    quote:
      "HealthCareConnect has made managing my health so much easier. The appointment booking system is a lifesaver!",
    author: "Sarah W.",
  },
  {
    quote:
      "The lab services are quick and reliable. I love having all my results in one place.",
    author: "James L.",
  },
  {
    quote:
      "The digital records feature has been a game-changer for me. No more worrying about misplaced files!",
    author: "Emily R.",
  },
];
