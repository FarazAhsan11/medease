import type { ToggleOption } from "@/components/shared/toggle-list-card";

export type PatientProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
};

export const patientProfile: PatientProfile = {
  firstName: "Ali",
  lastName: "Raza",
  email: "ali.raza@example.com",
  phone: "+92 300 5551234",
  dateOfBirth: "1992-04-16",
  gender: "Male",
  address: "House 12, Street 4, Gulberg III, Lahore",
};

export const patientNotificationPreferences: ToggleOption[] = [
  {
    id: "notify-appointments",
    label: "Appointment reminders",
    description: "A reminder 24 hours and 1 hour before each visit.",
    enabled: true,
  },
  {
    id: "notify-reports",
    label: "Lab reports",
    description: "When a new lab report is ready.",
    enabled: true,
  },
  {
    id: "notify-refills",
    label: "Refill reminders",
    description: "When a prescription is about to run out.",
    enabled: true,
  },
  {
    id: "notify-offers",
    label: "Health tips and offers",
    description: "Occasional articles and package discounts.",
    enabled: false,
  },
];
