import { siteConfig } from "@/config/site";

import type { LegalDocument } from "./legal-types";

const { name } = siteConfig;

export const partnerTerms: LegalDocument = {
  slug: "partner-terms",
  title: "Doctor and Lab Partner Terms",
  summary: `The agreement between ${name} and the doctors and labs who join it.`,
  version: "1.0",
  updated: "2 November 2026",
  sections: [
    {
      title: "These terms",
      body: [
        `These terms apply when you register on ${name} as a doctor or a lab, alongside the Terms of Use and the Privacy Policy. You stay independent: nothing here makes you an employee, agent or partner of ${name}.`,
      ],
    },
    {
      title: "Verification",
      body: [
        "New accounts start as pending. You can sign in and complete your profile, but patients will not see or book you until an administrator approves you. We may ask for more documents, and we may reject an application.",
        "Tell us straight away if your licence or registration expires, is suspended or changes.",
      ],
    },
    {
      title: "Doctors: your practice",
      body: [
        [
          "Hold a valid PMDC registration, and practise only within it.",
          "Meet any telemedicine rule that applies where your patients are, such as registration under the Sindh Telemedicine and Telehealth Act.",
          "You alone are responsible for your clinical decisions, your advice and your prescriptions.",
          "Send a patient for in-person care when a video consultation is not safe or not enough.",
          "Keep the profile, fee and weekly hours you publish accurate.",
        ],
      ],
    },
    {
      title: "Doctors: appointments and prescriptions",
      body: [
        [
          "Keep the appointments you accept. Set time off in advance, and cancel affected bookings so that patients can rebook.",
          "Issue prescriptions in the app, for the appointment they belong to, from its start until 14 days after. An edit creates a new version that replaces the last one.",
          "Record outcomes honestly, including whether a patient attended.",
        ],
      ],
    },
    {
      title: "Labs",
      body: [
        "Lab bookings are still being built. Registering now lets you prepare your account. When bookings start:",
        [
          "You must hold a valid licence from your provincial healthcare commission.",
          "You must keep your address, test catalog and prices accurate.",
          "You alone are responsible for sample handling, testing and the accuracy of your reports.",
        ],
        "We will publish a new version of these terms before lab bookings start.",
      ],
    },
    {
      title: "Patient confidentiality",
      body: [
        "Use patient information only to care for that patient, and keep it confidential as your professional duties require. Do not move it outside the app, share it or use it for marketing. Join calls from a private place, and do not record them without the patient's consent.",
      ],
    },
    {
      title: "Account security",
      body: [
        "Two-factor sign-in is required for doctors and labs. Your account is for you alone. Do not share it with staff or colleagues, and tell us straight away if you think it has been used by someone else.",
      ],
    },
    {
      title: "Fees",
      body: [
        `${name} does not take payments or charge commission yet. Before that changes, we will publish a new version of these terms with the commission and payout details, and ask you to accept it.`,
      ],
    },
    {
      title: "Suspension and leaving",
      body: [
        "We may suspend or remove you if your licence lapses, if you break these terms, or if patients may be at risk. You can leave at any time, but please complete or cancel your upcoming appointments first. Clinical records are kept for the period set out in the Privacy Policy.",
      ],
    },
    {
      title: "Liability",
      body: [
        `You are responsible for claims that arise from your clinical or laboratory work. As far as the law allows, ${name} is not liable for indirect or consequential loss, or for lost income when the service is unavailable.`,
      ],
    },
    {
      title: "Changes and disputes",
      body: [
        "If we make a significant change to these terms, we will ask you to accept the new version. These terms are governed by the laws of Pakistan, and any dispute we cannot settle goes to the courts of Pakistan.",
      ],
    },
  ],
};
