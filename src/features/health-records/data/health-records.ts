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
