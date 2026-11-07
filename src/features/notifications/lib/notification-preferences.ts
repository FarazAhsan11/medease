import type { DashboardRole } from "@/config/dashboards";

// Emails people can turn off. Keep in step with private.notification_categories
// and the table's check in *_notification_preferences.sql.
export const emailCategoryIds = [
  "appointment_reminders",
  "prescriptions",
  "doctor_bookings",
] as const;

export type EmailCategory = (typeof emailCategoryIds)[number];

type EmailSetting = {
  label: string;
  description: string;
};

export type OptionalEmailSetting = EmailSetting & { id: EmailCategory };

type RoleEmailSettings = {
  optional: OptionalEmailSetting[];
  // Shown so people know what still arrives; they can't be turned off.
  required: EmailSetting[];
};

const accountEmails: EmailSetting = {
  label: "Account and security",
  description: "Confirming your email, resetting your password and sign-in.",
};

export const emailSettings: Partial<Record<DashboardRole, RoleEmailSettings>> =
  {
    patient: {
      optional: [
        {
          id: "appointment_reminders",
          label: "Appointment reminders",
          description: "A day before and an hour before each visit.",
        },
        {
          id: "prescriptions",
          label: "Prescriptions",
          description: "When a doctor issues, changes or cancels one.",
        },
      ],
      required: [
        {
          label: "Bookings and cancellations",
          description:
            "Confirms each booking and tells you if a doctor cancels.",
        },
        accountEmails,
      ],
    },
    doctor: {
      optional: [
        {
          id: "doctor_bookings",
          label: "Bookings and cancellations",
          description: "When a patient books or cancels a visit.",
        },
      ],
      required: [
        {
          label: "Verification",
          description: "The result of each review of your profile.",
        },
        accountEmails,
      ],
    },
  };

export type EmailPreferences = Partial<Record<EmailCategory, boolean>>;

// No saved row means the email is on.
export const isEmailOn = (preferences: EmailPreferences, id: EmailCategory) =>
  preferences[id] ?? true;
