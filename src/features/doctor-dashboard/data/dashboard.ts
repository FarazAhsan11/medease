import {
  CalendarDaysIcon,
  MessageSquareIcon,
  StarIcon,
  UsersIcon,
} from "lucide-react";

import type { Stat } from "@/components/shared/stat-card";

export type PatientAppointment = {
  id: string;
  patientName: string;
  reason: string;
  time: string;
  age: number;
  gender: string;
  history: string;
  lastVisit: string;
};

export type ChatMessage = {
  id: string;
  from: "patient" | "doctor";
  text: string;
  time: string;
};

export type MessageThread = {
  id: string;
  patientName: string;
  preview: string;
  time: string;
  unread: boolean;
  messages: ChatMessage[];
};

export type DoctorProfile = {
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  address: string;
  email: string;
  phone: string;
  specialization: string;
  licenseNumber: string;
  memberSince: string;
  photo: string;
};

export const patientAppointments: PatientAppointment[] = [
  {
    id: "pa-1",
    patientName: "Sadia Bano",
    reason: "Stomach pain",
    time: "10:00 AM",
    age: 25,
    gender: "Female",
    history: "No significant history",
    lastVisit: "Aug 14, 2026",
  },
  {
    id: "pa-2",
    patientName: "Shabna Firdos",
    reason: "Stomach pain",
    time: "11:00 AM",
    age: 30,
    gender: "Female",
    history: "Hypertension",
    lastVisit: "Sep 2, 2026",
  },
  {
    id: "pa-3",
    patientName: "Ali Khan",
    reason: "Headache",
    time: "12:00 PM",
    age: 40,
    gender: "Male",
    history: "Migraine",
    lastVisit: "Sep 21, 2026",
  },
];

export const messageThreads: MessageThread[] = [
  {
    id: "thread-1",
    patientName: "Shabna Firdos",
    preview: "Hi Doctor, I have a question about my prescription.",
    time: "10:15 AM",
    unread: true,
    messages: [
      {
        id: "m1",
        from: "doctor",
        text: "Your blood pressure readings look much better this week.",
        time: "Yesterday, 4:20 PM",
      },
      {
        id: "m2",
        from: "patient",
        text: "Thank you! I've been taking the medicine every morning.",
        time: "Yesterday, 4:35 PM",
      },
      {
        id: "m3",
        from: "patient",
        text: "Hi Doctor, I have a question about my prescription. Can I take it with food?",
        time: "10:15 AM",
      },
    ],
  },
  {
    id: "thread-2",
    patientName: "Ali Khan",
    preview: "Can we reschedule my appointment?",
    time: "9:30 AM",
    unread: false,
    messages: [
      {
        id: "m1",
        from: "patient",
        text: "Can we reschedule my appointment to next week?",
        time: "9:30 AM",
      },
    ],
  },
  {
    id: "thread-3",
    patientName: "Sadia Bano",
    preview: "The stomach pain has eased since yesterday.",
    time: "Mon",
    unread: false,
    messages: [
      {
        id: "m1",
        from: "patient",
        text: "The stomach pain has eased since yesterday.",
        time: "Mon, 6:10 PM",
      },
      {
        id: "m2",
        from: "doctor",
        text: "Good to hear. Keep up the fluids and light meals for a few days.",
        time: "Mon, 6:45 PM",
      },
    ],
  },
];

export const doctorProfile: DoctorProfile = {
  firstName: "Nida",
  lastName: "Ali",
  age: 38,
  gender: "Female",
  address: "Lahore, Punjab",
  email: "nida.ali@medease.com",
  phone: "+92 300 1234567",
  specialization: "General Practitioner",
  licenseNumber: "PMC-12345",
  memberSince: "Jan 10, 2025",
  photo: "/images/doctor-avatar.png",
};

export const doctorStats: Stat[] = [
  {
    label: "Today's appointments",
    value: "3",
    hint: "Next at 10:00 AM",
    icon: CalendarDaysIcon,
  },
  {
    label: "Active patients",
    value: "48",
    hint: "+4 this week",
    icon: UsersIcon,
  },
  {
    label: "Unread messages",
    value: "1",
    hint: "3 conversations",
    icon: MessageSquareIcon,
  },
  {
    label: "Average rating",
    value: "4.9",
    hint: "214 reviews",
    icon: StarIcon,
  },
];
