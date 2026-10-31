export type Faq = {
  question: string;
  answer: string;
};

export const faqs: Faq[] = [
  {
    question: "How do I find the right doctor?",
    answer:
      "Search by name, specialty, gender and city. Every doctor listed has been checked by our team against their PMDC registration.",
  },
  {
    question: "Can I book a lab test?",
    answer:
      "Not yet. Lab booking is coming soon, and the lab pages show sample information until then.",
  },
  {
    question: "Is my medical data secure?",
    answer:
      "Your data is encrypted in transit and at rest by our database provider, video calls are encrypted between you and your doctor, and only you and the doctors you see can read your clinical records. You can also add two-factor authentication to your account.",
  },
  {
    question: "How do I pay for a consultation?",
    answer:
      "Online payment isn't available yet. Each doctor's fee is shown when you book, and you arrange payment directly with them.",
  },
];
