export type Service = {
  icon: string;
  title: string;
  description: string;
};

export const services: Service[] = [
  {
    icon: "/images/service-ai.svg",
    title: "Get AI Medical Assistant",
    description:
      "Assess your symptoms instantly with our AI Medical Assistant and get personalized health recommendations, anytime, anywhere.",
  },
  {
    icon: "/images/service-find-doctor.svg",
    title: "Find a Doctor",
    description:
      "Connect with top specialists for expert consultations, available at your convenience. At your door steps.",
  },
  {
    icon: "/images/service-lab.svg",
    title: "Lab Test Booking",
    description:
      "Book lab tests online with home sample collection for your convenience. Get fast and reliable results delivered directly to you.",
  },
  {
    icon: "/images/service-medicine.svg",
    title: "Order Medicines",
    description:
      "Order your medicines online and enjoy fast, hassle-free delivery. Stay stocked with essentials, right at your doorstep.",
  },
];
