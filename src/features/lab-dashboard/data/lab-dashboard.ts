import {
  CheckCheckIcon,
  ClipboardListIcon,
  HouseIcon,
  MicroscopeIcon,
} from "lucide-react";

import type { Stat } from "@/components/shared/stat-card";
import type { ToggleOption } from "@/components/shared/toggle-list-card";

export type BookingStatus =
  "Pending" | "Sample collected" | "Processing" | "Completed";

export type LabBooking = {
  id: string;
  patientName: string;
  tests: string[];
  collection: "Home" | "Walk-in";
  slot: string;
  area: string;
  status: BookingStatus;
};

export type PublishedReport = {
  id: string;
  patientName: string;
  test: string;
  publishedOn: string;
  flagged: boolean;
};

export type LabProfile = {
  name: string;
  registrationNumber: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  hours: string;
};

export const bookingStatuses: BookingStatus[] = [
  "Pending",
  "Sample collected",
  "Processing",
  "Completed",
];

export const labStats: Stat[] = [
  {
    label: "Today's bookings",
    value: "18",
    hint: "+5 vs. yesterday",
    icon: ClipboardListIcon,
  },
  {
    label: "Home collections",
    value: "7",
    hint: "3 still to collect",
    icon: HouseIcon,
  },
  {
    label: "In processing",
    value: "9",
    hint: "Avg. 6h turnaround",
    icon: MicroscopeIcon,
  },
  {
    label: "Reports delivered",
    value: "124",
    hint: "This month",
    icon: CheckCheckIcon,
  },
];

export const labBookings: LabBooking[] = [
  {
    id: "BK-3101",
    patientName: "Ali Raza",
    tests: ["Lipid Profile"],
    collection: "Home",
    slot: "7:30 AM",
    area: "Gulberg III",
    status: "Processing",
  },
  {
    id: "BK-3102",
    patientName: "Hina Siddiqui",
    tests: ["CBC", "HbA1c"],
    collection: "Home",
    slot: "8:00 AM",
    area: "DHA Phase 5",
    status: "Sample collected",
  },
  {
    id: "BK-3103",
    patientName: "Bilal Ahmed",
    tests: ["Thyroid Profile"],
    collection: "Walk-in",
    slot: "9:00 AM",
    area: "Lab · Counter 2",
    status: "Completed",
  },
  {
    id: "BK-3104",
    patientName: "Zara Hussain",
    tests: ["Vitamin D (25-OH)"],
    collection: "Home",
    slot: "9:30 AM",
    area: "Model Town",
    status: "Pending",
  },
  {
    id: "BK-3105",
    patientName: "Usman Tariq",
    tests: ["Full Body Checkup"],
    collection: "Home",
    slot: "10:00 AM",
    area: "Johar Town",
    status: "Pending",
  },
  {
    id: "BK-3106",
    patientName: "Ayesha Malik",
    tests: ["Urine Routine", "KFT"],
    collection: "Walk-in",
    slot: "10:30 AM",
    area: "Lab · Counter 1",
    status: "Processing",
  },
  {
    id: "BK-3107",
    patientName: "Kamran Shah",
    tests: ["Liver Function Test"],
    collection: "Home",
    slot: "11:00 AM",
    area: "Cantt",
    status: "Pending",
  },
];

export const publishedReports: PublishedReport[] = [
  {
    id: "RP-901",
    patientName: "Bilal Ahmed",
    test: "Thyroid Profile",
    publishedOn: "Today, 1:10 PM",
    flagged: false,
  },
  {
    id: "RP-899",
    patientName: "Ali Raza",
    test: "Complete Blood Count",
    publishedOn: "Oct 5, 4:45 PM",
    flagged: false,
  },
  {
    id: "RP-894",
    patientName: "Sana Javed",
    test: "HbA1c",
    publishedOn: "Oct 5, 11:20 AM",
    flagged: true,
  },
];

export const popularTests = [
  { name: "Complete Blood Count", bookings: 46 },
  { name: "Lipid Profile", bookings: 31 },
  { name: "HbA1c", bookings: 27 },
  { name: "Vitamin D (25-OH)", bookings: 19 },
];

export const labProfile: LabProfile = {
  name: "CityCare Diagnostics",
  registrationNumber: "LAB-48213",
  contactPerson: "Imran Qureshi",
  email: "contact@citycare.pk",
  phone: "+92 42 3577 1234",
  address: "45-B Main Boulevard, Gulberg III, Lahore",
  hours: "Mon – Sat, 7 AM – 9 PM",
};

export const labServices: ToggleOption[] = [
  {
    id: "service-home",
    label: "Home sample collection",
    description: "Patients can book a phlebotomist visit.",
    enabled: true,
  },
  {
    id: "service-online",
    label: "Online reports",
    description: "Publish results straight to patient dashboards.",
    enabled: true,
  },
  {
    id: "service-urgent",
    label: "Same-day urgent tests",
    description: "Accept bookings marked as urgent.",
    enabled: false,
  },
];
