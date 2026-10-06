export type Faq = {
  question: string;
  answer: string;
};

export const faqs: Faq[] = [
  {
    question: "How does the AI recommend doctors?",
    answer:
      "Our AI recommends doctors based on your health profile, preferences, and ratings from other users.",
  },
  {
    question: "How do I book a lab test?",
    answer:
      "You can book a lab test through our app or website by selecting the test, choosing a time slot, and confirming the appointment.",
  },
  {
    question: "Is my medical data secure?",
    answer:
      "Yes, your medical data is protected with advanced encryption and security protocols, ensuring your privacy and confidentiality at all times.",
  },
  {
    question: "What are the payment methods available?",
    answer:
      "We accept various payment methods including credit cards, debit cards, and online payment services for your convenience.",
  },
];
