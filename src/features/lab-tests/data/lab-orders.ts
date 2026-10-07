export const orderStages = [
  "Booked",
  "Sample collected",
  "Processing",
  "Report ready",
] as const;

export type OrderStage = (typeof orderStages)[number];

export type LabOrder = {
  id: string;
  testName: string;
  lab: string;
  scheduledFor: string;
  collection: "Home collection" | "Lab visit";
  stage: OrderStage;
  price: number;
};

export const labOrders: LabOrder[] = [
  {
    id: "LO-2041",
    testName: "Complete Blood Count (CBC)",
    lab: "CityCare Diagnostics",
    scheduledFor: "Mon, Oct 5, 2026 · 8:00 AM",
    collection: "Home collection",
    stage: "Report ready",
    price: 1200,
  },
  {
    id: "LO-2057",
    testName: "Lipid Profile",
    lab: "CityCare Diagnostics",
    scheduledFor: "Tue, Oct 6, 2026 · 7:30 AM",
    collection: "Home collection",
    stage: "Processing",
    price: 2200,
  },
  {
    id: "LO-2063",
    testName: "Vitamin D (25-OH)",
    lab: "Prime Lab Services",
    scheduledFor: "Sat, Oct 10, 2026 · 9:00 AM",
    collection: "Lab visit",
    stage: "Booked",
    price: 3200,
  },
];
