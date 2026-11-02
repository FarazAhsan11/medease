import { siteConfig } from "@/config/site";

import type { LegalDocument } from "./legal-types";

const { name } = siteConfig;

export const telemedicineConsent: LegalDocument = {
  slug: "telemedicine-consent",
  title: "Telemedicine Consent",
  summary:
    "What an online consultation can and cannot do, and what you agree to before having one.",
  version: "1.0",
  updated: "2 November 2026",
  sections: [
    {
      title: "What telemedicine is",
      body: [
        `Telemedicine means consulting a doctor by video instead of in person. On ${name}, your doctor is registered with the PMDC and is responsible for your care during the consultation.`,
      ],
    },
    {
      title: "What it cannot do",
      body: [
        [
          "Your doctor cannot examine you physically, and relies on what you say and show on camera.",
          "Some conditions cannot be assessed safely online. Your doctor may ask you to see someone in person or go to a hospital.",
          "Your doctor may decide not to prescribe a medicine online.",
          "A poor connection can cut a call short or make it harder to see and hear each other.",
        ],
        "It is not for emergencies. If you need urgent care, call Rescue 1122 or Edhi 115, or go to the nearest hospital.",
      ],
    },
    {
      title: "What we ask of you",
      body: [
        [
          "Be truthful and complete about your symptoms, history, allergies and medicines.",
          "Join from a private place, and tell the doctor if someone else is in the room.",
          "Follow up in person if your doctor advises it, or if you get worse.",
        ],
      ],
    },
    {
      title: "Privacy during the call",
      body: [
        "The video runs directly between your browser and your doctor's, encrypted. It is not recorded by us. Your doctor keeps a record of the consultation, as they would for a visit to a clinic.",
      ],
    },
    {
      title: "Your data leaves Pakistan",
      body: [
        `${name} stores and processes your personal and health data outside Pakistan, in South Korea and the United States. The Privacy Policy lists each provider and what it handles. By giving this consent, you agree to your data being moved there.`,
      ],
    },
    {
      title: "Consent for a family member",
      body: [
        "If you book for a child or another person in your care, you confirm that you are allowed to act for them and you give this consent on their behalf. Where they are able to understand, explain the consultation to them too.",
      ],
    },
    {
      title: "Your choice",
      body: [
        "Telemedicine is your choice. You can see a doctor in person instead, stop a consultation at any time, and withdraw this consent in your account settings once any booked visits are cancelled. Withdrawing means you can no longer book consultations here until you give it again. It does not affect care you have already received.",
      ],
    },
  ],
};
