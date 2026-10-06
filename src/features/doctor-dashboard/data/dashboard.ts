import {
  CalendarDaysIcon,
  MessageSquareIcon,
  StarIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

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

export type PatientMessage = {
  id: string;
  sender: string;
  message: string;
  time: string;
  unread: boolean;
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

export type DashboardStat = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
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

export const patientMessages: PatientMessage[] = [
  {
    id: "msg-1",
    sender: "Shabna Firdos",
    message: "Hi Doctor, I have a question about my prescription.",
    time: "10:15 AM",
    unread: true,
  },
  {
    id: "msg-2",
    sender: "Ali Khan",
    message: "Can we reschedule my appointment?",
    time: "11:30 AM",
    unread: false,
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

export const dashboardStats: DashboardStat[] = [
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
    hint: "2 conversations",
    icon: MessageSquareIcon,
  },
  {
    label: "Average rating",
    value: "4.9",
    hint: "214 reviews",
    icon: StarIcon,
  },
];
