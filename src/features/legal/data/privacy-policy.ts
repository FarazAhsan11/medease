import { siteConfig } from "@/config/site";

import type { LegalDocument } from "./legal-types";

const { name } = siteConfig;

export const privacyPolicy: LegalDocument = {
  slug: "privacy",
  title: "Privacy Policy",
  summary: `What personal data ${name} holds, why we hold it, who can see it and how long we keep it.`,
  version: "1.0",
  updated: "2 November 2026",
  sections: [
    {
      title: "Who we are",
      body: [
        `${name} ("we", "us") connects patients with PMDC-registered doctors for consultations. We are responsible for the personal data held in ${name}. The doctor you consult is also responsible for the clinical record of your care.`,
      ],
    },
    {
      title: "What we collect",
      body: [
        [
          "Account details: your name, email address, phone number and role. Your password is stored only as a hash.",
          "Emergency contact: the name and phone number you choose to give us.",
          "Medical profile: date of birth, gender, blood group, height, weight, allergies, long-term conditions and current medicines.",
          "Family members: the same medical profile, and their relation to you, for anyone you add to your account.",
          "Appointments: the doctor, date and time, status, the reason for the visit and any reason given for cancelling.",
          "Clinical records: prescriptions your doctor issues, the visit summary your doctor writes for you (diagnosis, advice and any follow-up date) and the private notes your doctor keeps.",
          "Documents you upload: the file (PDF, JPG or PNG), the name, type and date you give it, and its size. Only you can see them; doctors cannot.",
          "Medicine reminders: if you turn them on, your chosen times and time zone, and when each reminder went out.",
          "Call details: when each person joined and left a call. We do not record audio or video.",
          "Doctor and lab details: licence or registration numbers, specialty, clinic or lab address, verification documents and the outcome of our review.",
          "Security details: sign-in events, two-factor settings and hashed IP addresses.",
        ],
      ],
    },
    {
      title: "How we use it",
      body: [
        [
          "To run your account and let you book, join and cancel appointments.",
          "To give your doctor what they need to care for you.",
          "To send confirmations, reminders and account notices.",
          "To check that doctors and labs are properly licensed.",
          "To keep the service secure and investigate misuse.",
          "To meet our legal duties.",
        ],
        "We do not sell personal data, show advertising or use your health data for marketing.",
      ],
    },
    {
      title: "Who can see it",
      body: [
        [
          "You, through your account.",
          "A doctor, only for patients who have an appointment with them. Their private notes are not shown to patients.",
          "Our administrators, who review doctor and lab verification documents. Clinical records are not part of that work, and sensitive actions are logged.",
          "The service providers listed below, only to run the service.",
          "Authorities, when the law requires it.",
        ],
        "A verified doctor's name, specialty, fee and hours are public, so that patients can find them.",
      ],
    },
    {
      title: "Data stored outside Pakistan",
      body: [
        `${name} is not hosted in Pakistan. Your personal data, including health data, is stored and processed in the countries below. We ask for your consent to this when you sign up, and you should not use ${name} if you do not agree.`,
        {
          headers: ["Provider", "Used for", "Data it handles", "Location"],
          rows: [
            [
              "Supabase",
              "Database, sign-in, file storage, live updates, scheduled jobs",
              "All data described in this policy",
              "Seoul, South Korea",
            ],
            [
              "Vercel",
              "Hosting the website and server code",
              "Request data and the pages shown to you",
              "Washington D.C., United States",
            ],
            [
              "Google",
              "Sending email",
              "Name, email address and the email itself",
              "United States and other countries",
            ],
            [
              "Google",
              "Helping two browsers connect for a video call",
              "IP addresses only",
              "United States and other countries",
            ],
          ],
        },
        "We will update this list before a new provider receives personal data.",
      ],
    },
    {
      title: "Emails",
      body: [
        "Emails are not a private channel, so ours stay brief. They never carry your doctor's name or specialty, a reason for a visit or cancellation, a diagnosis or a medicine. They link to the app, where the details sit behind sign-in.",
      ],
    },
    {
      title: "Cookies",
      body: [
        `${name} uses only the cookies it needs to work: sign-in cookies that keep you logged in, and a cookie lasting one minute that carries a short on-screen message between pages. We do not use advertising or analytics cookies.`,
      ],
    },
    {
      title: "How long we keep it",
      body: [
        {
          headers: ["Data", "Kept for", "If you delete your account"],
          rows: [
            [
              "Account and medical profile",
              "While your account is open",
              "Deleted",
            ],
            [
              "Appointments, prescriptions, visit summaries and doctors' notes",
              "7 years after the last visit. For a minor, until they turn 25",
              "Kept, no longer linked to your identity",
            ],
            ["Documents you upload", "Until you delete them", "Deleted"],
            [
              "Doctor and lab verification documents",
              "While the account is active, then 1 year",
              "Deleted after 1 year",
            ],
            ["Security log", "7 years", "Kept, ids only"],
            ["Call details", "1 year", "Deleted"],
            ["Notifications and reminder log", "90 days", "Deleted"],
            ["Sign-in tokens", "30 days after they expire", "Deleted"],
          ],
        },
      ],
    },
    {
      title: "Your rights",
      body: [
        "Pakistan has not yet enacted a data protection law. We follow the principles of the proposed Personal Data Protection Bill, which treats health data as sensitive. You can:",
        [
          "Ask for a copy of your data.",
          "Correct your details in your account. To correct a clinical record, ask the doctor who wrote it.",
          "Ask us to delete your account. Clinical records are kept for the period above, because doctors must be able to answer for the care they gave.",
          "Withdraw your consent. We can no longer offer consultations after that, and what was done before stays lawful.",
        ],
        "Contact us to use any of these rights. We will confirm it is you before acting.",
      ],
    },
    {
      title: "Security",
      body: [
        "Data is encrypted in transit, and database rules decide who can read each record. Doctors, labs and administrators must use two-factor sign-in, and patients can turn it on. Video calls run directly between the two browsers, encrypted, and are not recorded.",
        "No system is completely secure. If a breach puts your data at risk, we will tell you and the relevant authorities, aiming to do so within 72 hours.",
      ],
    },
    {
      title: "Children",
      body: [
        "Accounts are for adults. A parent or guardian can add a child as a family member and manages that child's data.",
      ],
    },
    {
      title: "Changes to this policy",
      body: [
        "The version and date at the top of this page show which policy applies. If a change affects your consent, we will ask you to accept the new version.",
      ],
    },
  ],
};
