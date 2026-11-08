import { siteConfig } from "@/config/site";

import type { LegalDocument } from "./legal-types";

const { name } = siteConfig;

export const refundPolicy: LegalDocument = {
  slug: "refunds",
  title: "Refund and Cancellation Policy",
  summary:
    "How to cancel an appointment, what happens if your doctor cancels, and how refunds will work.",
  version: "1.1",
  updated: "8 November 2026",
  sections: [
    {
      title: "Payments today",
      body: [
        `${name} does not take payments yet. The fee on a doctor's profile is for information, and you pay nothing through ${name} when you book, so there is nothing for us to refund.`,
      ],
    },
    {
      title: "If you cancel",
      body: [
        "You can cancel from your appointments page at any time before the appointment starts, and you will be asked for a reason. The slot then becomes free for someone else.",
      ],
    },
    {
      title: "If your doctor cancels",
      body: [
        "Your doctor can also cancel before the start, for example when they take time off. We will let you know in the app and by email, and you can book another slot.",
      ],
    },
    {
      title: "If you miss your appointment",
      body: [
        "A doctor can mark an appointment as a no-show if you do not attend. Please cancel if you cannot make it, so that another patient can have the slot.",
      ],
    },
    {
      title: "When online payment starts",
      body: [
        "We will publish a new version of this policy before we take any payment, and ask you to accept it. These rules will apply:",
        [
          "A full refund if the doctor cancels.",
          "A full refund if the doctor is suspended before your appointment.",
          "A full refund if the call fails because of a problem on our side.",
        ],
        "The new version will also set the cut-off for free cancellation and the rules for late cancellations and no-shows.",
      ],
    },
    {
      title: "Lab tests and medicines",
      body: [
        `Lab bookings are paid in cash to the lab, at the lab or to its collector, so ${name} takes no payment and makes no refund for them. To cancel or change a lab booking, call the lab before your visit or collection.`,
        "Medicine ordering is not available yet, so nothing can be bought or refunded for it.",
      ],
    },
  ],
};
