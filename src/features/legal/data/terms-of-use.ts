import { siteConfig } from "@/config/site";

import type { LegalDocument } from "./legal-types";

const { name } = siteConfig;

export const termsOfUse: LegalDocument = {
  slug: "terms",
  title: "Terms of Use",
  summary: `The agreement between you and ${name}.`,
  version: "1.1",
  updated: "8 November 2026",
  sections: [
    {
      title: "These terms",
      body: [
        `These terms are an agreement between you and ${name} ("we", "us"). By creating an account or using ${name}, you agree to these terms, the Privacy Policy and, for patients, the Telemedicine Consent. Doctors and labs also agree to the Partner Terms.`,
      ],
    },
    {
      title: `What ${name} is`,
      body: [
        `${name} is a platform that connects patients with independent doctors. We do not practise medicine, and we do not employ the doctors listed. Each doctor is responsible for the advice, diagnosis and prescriptions they give you.`,
        "We check a doctor's PMDC registration before listing them. That check does not guarantee any result from a consultation.",
      ],
    },
    {
      title: "Not for emergencies",
      body: [
        `Do not use ${name} in a medical emergency. Call Rescue 1122 or Edhi 115, or go to the nearest hospital.`,
      ],
    },
    {
      title: "What is available today",
      body: [
        "You can find doctors, book and cancel appointments, have video consultations and receive prescriptions. You can also compare lab test prices and book a test at a verified lab, for a lab visit or home collection.",
        "A lab booking is between you and the lab. The lab carries out the test, is responsible for it and its report, and is paid in cash, at the lab or to its collector. To cancel or change a lab booking, call the lab.",
        "Lab reports, medicine ordering, health records and the AI assistant are still being built. Pages about them are previews. Nothing shown there is an offer, a price you can rely on or medical advice.",
      ],
    },
    {
      title: "Your account",
      body: [
        [
          "You must be at least 18 to create an account.",
          "Give accurate details and keep them up to date.",
          "Keep your password and two-factor device to yourself. You are responsible for what happens under your account.",
          "Tell us straight away if you think someone else has used your account.",
        ],
      ],
    },
    {
      title: "Booking for someone else",
      body: [
        "You can book for a family member you are responsible for. By doing so you confirm that you may share their health details and that they, or you on their behalf, accept the Telemedicine Consent.",
      ],
    },
    {
      title: "Appointments",
      body: [
        "Slots shown are the doctor's published hours. Be ready on time, somewhere private, with a working camera and microphone. A doctor can mark you as a no-show if you do not attend. Cancelling is covered by the Refund and Cancellation Policy.",
      ],
    },
    {
      title: "Prescriptions",
      body: [
        "Prescriptions come from your doctor, who decides what is appropriate. A doctor may decline to prescribe online. Follow the directions given and ask a doctor or pharmacist if you are unsure.",
      ],
    },
    {
      title: "Acceptable use",
      body: [
        "You must not:",
        [
          "Pretend to be someone else or give false medical or licence details.",
          "Record a consultation without the other person's consent.",
          "Harass, threaten or abuse doctors, patients or our staff.",
          "Try to reach data that is not yours, test our security without permission, or disrupt the service.",
          "Copy or resell the service or its content.",
        ],
      ],
    },
    {
      title: "Our content",
      body: [
        `${name} and its design, text and code belong to us or our licensors. Your own data stays yours. You allow us to use it only as the Privacy Policy describes.`,
      ],
    },
    {
      title: "Suspending or closing accounts",
      body: [
        "We may suspend or close an account that breaks these terms, puts others at risk or is required to stop by law. You can ask us to close your account at any time. Records we must keep are handled as the Privacy Policy describes.",
      ],
    },
    {
      title: "Service and liability",
      body: [
        "We work to keep the service reliable, but calls can fail and the service can be unavailable. It is provided as it is, without promises that it will always work.",
        `As far as the law allows, ${name} is not liable for a doctor's clinical decisions, or for indirect or consequential loss. Nothing in these terms limits a liability that the law does not allow us to limit.`,
      ],
    },
    {
      title: "Changes to these terms",
      body: [
        "The version and date at the top of this page show which terms apply. If a change is significant, we will ask you to accept the new version before you continue.",
      ],
    },
    {
      title: "Law and disputes",
      body: [
        "These terms are governed by the laws of Pakistan. Please contact us first, as most problems can be solved directly. Any dispute we cannot settle goes to the courts of Pakistan.",
      ],
    },
  ],
};
