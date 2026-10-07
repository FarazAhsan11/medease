export type DoseTime = "Morning" | "Afternoon" | "Night";

export type Prescription = {
  id: string;
  medicine: string;
  strength: string;
  instructions: string;
  doses: DoseTime[];
  prescribedBy: string;
  startedOn: string;
  refillsLeft: number;
  totalRefills: number;
  daysRemaining: number;
};

export const doseTimes: DoseTime[] = ["Morning", "Afternoon", "Night"];

export const prescriptions: Prescription[] = [
  {
    id: "rx-1",
    medicine: "Atorvastatin",
    strength: "20 mg",
    instructions: "1 tablet after dinner",
    doses: ["Night"],
    prescribedBy: "Dr. Ayesha Khan",
    startedOn: "Aug 2, 2026",
    refillsLeft: 1,
    totalRefills: 3,
    daysRemaining: 3,
  },
  {
    id: "rx-2",
    medicine: "Metformin",
    strength: "500 mg",
    instructions: "1 tablet with breakfast and dinner",
    doses: ["Morning", "Night"],
    prescribedBy: "Dr. Nida Ali",
    startedOn: "Jun 18, 2026",
    refillsLeft: 2,
    totalRefills: 4,
    daysRemaining: 17,
  },
  {
    id: "rx-3",
    medicine: "Vitamin D3",
    strength: "50,000 IU",
    instructions: "1 capsule once a week after lunch",
    doses: ["Afternoon"],
    prescribedBy: "Dr. Nida Ali",
    startedOn: "Sep 20, 2026",
    refillsLeft: 0,
    totalRefills: 0,
    daysRemaining: 24,
  },
];
