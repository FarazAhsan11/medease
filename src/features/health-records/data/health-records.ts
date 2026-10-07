import {
  ActivityIcon,
  DropletIcon,
  HeartPulseIcon,
  ScaleIcon,
  type LucideIcon,
} from "lucide-react";

import type { StatusTone } from "@/components/shared/status-badge";

export type Vital = {
  label: string;
  value: string;
  unit: string;
  status: string;
  tone: StatusTone;
  recordedOn: string;
  icon: LucideIcon;
};

export type HealthDocument = {
  id: string;
  name: string;
  type: "Lab report" | "Prescription" | "Visit summary" | "Imaging";
  date: string;
  source: string;
};

export const vitals: Vital[] = [
  {
    label: "Blood pressure",
    value: "122/80",
    unit: "mmHg",
    status: "Normal",
    tone: "success",
    recordedOn: "Oct 5, 2026",
    icon: ActivityIcon,
  },
  {
    label: "Heart rate",
    value: "74",
    unit: "bpm",
    status: "Normal",
    tone: "success",
    recordedOn: "Oct 5, 2026",
    icon: HeartPulseIcon,
  },
  {
    label: "Fasting glucose",
    value: "108",
    unit: "mg/dL",
    status: "Slightly high",
    tone: "warning",
    recordedOn: "Sep 28, 2026",
    icon: DropletIcon,
  },
  {
    label: "Weight",
    value: "72",
    unit: "kg",
    status: "BMI 23.5",
    tone: "info",
    recordedOn: "Oct 5, 2026",
    icon: ScaleIcon,
  },
];

export const medicalSummary = {
  bloodGroup: "O+",
  allergies: ["Penicillin", "Peanuts"],
  conditions: ["Type 2 diabetes", "High cholesterol"],
  emergencyContact: "Sara Raza · +92 300 7777777",
};

export const healthDocuments: HealthDocument[] = [
  {
    id: "doc-1",
    name: "Complete Blood Count",
    type: "Lab report",
    date: "Oct 5, 2026",
    source: "CityCare Diagnostics",
  },
  {
    id: "doc-2",
    name: "General consultation",
    type: "Visit summary",
    date: "Sep 21, 2026",
    source: "Dr. Nida Ali",
  },
  {
    id: "doc-3",
    name: "Atorvastatin 20 mg",
    type: "Prescription",
    date: "Aug 2, 2026",
    source: "Dr. Ayesha Khan",
  },
  {
    id: "doc-4",
    name: "Chest X-ray",
    type: "Imaging",
    date: "Mar 2, 2025",
    source: "Prime Lab Services",
  },
];
