export type LabTest = {
  id: string;
  name: string;
  category: string;
  description: string;
  sampleType: string;
  turnaround: string;
  preparation: string;
  price: number;
};

export type LabPackage = {
  id: string;
  name: string;
  description: string;
  testCount: number;
  includes: string[];
  price: number;
  originalPrice: number;
};

export const labCategories = [
  "All tests",
  "Blood",
  "Diabetes",
  "Heart",
  "Thyroid",
  "Liver & kidney",
  "Vitamins",
];

export const labTests: LabTest[] = [
  {
    id: "cbc",
    name: "Complete Blood Count (CBC)",
    category: "Blood",
    description:
      "Checks red cells, white cells, and platelets to screen for infection, anaemia, and other conditions.",
    sampleType: "Blood",
    turnaround: "Same day",
    preparation: "No special preparation needed.",
    price: 1200,
  },
  {
    id: "hba1c",
    name: "HbA1c",
    category: "Diabetes",
    description:
      "Shows your average blood sugar over the last 2–3 months to diagnose or monitor diabetes.",
    sampleType: "Blood",
    turnaround: "24 hours",
    preparation: "No fasting required.",
    price: 1800,
  },
  {
    id: "fasting-glucose",
    name: "Fasting Blood Sugar",
    category: "Diabetes",
    description: "Measures blood glucose after an overnight fast.",
    sampleType: "Blood",
    turnaround: "Same day",
    preparation: "Fast for 8–10 hours before the test. Water is fine.",
    price: 400,
  },
  {
    id: "lipid-profile",
    name: "Lipid Profile",
    category: "Heart",
    description:
      "Measures cholesterol and triglycerides to assess your risk of heart disease.",
    sampleType: "Blood",
    turnaround: "24 hours",
    preparation: "Fast for 10–12 hours before the test.",
    price: 2200,
  },
  {
    id: "thyroid-profile",
    name: "Thyroid Profile (T3, T4, TSH)",
    category: "Thyroid",
    description:
      "Evaluates how well your thyroid is working and helps detect hypo- or hyperthyroidism.",
    sampleType: "Blood",
    turnaround: "24 hours",
    preparation: "No special preparation needed.",
    price: 2500,
  },
  {
    id: "lft",
    name: "Liver Function Test",
    category: "Liver & kidney",
    description:
      "Checks enzymes and proteins that show how well your liver is working.",
    sampleType: "Blood",
    turnaround: "24 hours",
    preparation: "Avoid alcohol for 24 hours before the test.",
    price: 1900,
  },
  {
    id: "kft",
    name: "Kidney Function Test",
    category: "Liver & kidney",
    description:
      "Measures urea, creatinine, and electrolytes to assess kidney health.",
    sampleType: "Blood",
    turnaround: "24 hours",
    preparation: "No special preparation needed.",
    price: 1700,
  },
  {
    id: "vitamin-d",
    name: "Vitamin D (25-OH)",
    category: "Vitamins",
    description:
      "Detects vitamin D deficiency, a common cause of fatigue and bone pain.",
    sampleType: "Blood",
    turnaround: "48 hours",
    preparation: "No special preparation needed.",
    price: 3200,
  },
  {
    id: "urine-re",
    name: "Urine Routine Examination",
    category: "Liver & kidney",
    description:
      "Screens for urinary tract infections, kidney problems, and diabetes.",
    sampleType: "Urine",
    turnaround: "Same day",
    preparation: "Collect a mid-stream morning sample.",
    price: 500,
  },
];

export const labPackages: LabPackage[] = [
  {
    id: "full-body",
    name: "Full Body Checkup",
    description: "A complete yearly health screening.",
    testCount: 62,
    includes: ["CBC", "Lipid profile", "Liver & kidney", "Thyroid", "HbA1c"],
    price: 7500,
    originalPrice: 11000,
  },
  {
    id: "diabetes-care",
    name: "Diabetes Care",
    description: "Track and manage blood sugar levels.",
    testCount: 24,
    includes: ["HbA1c", "Fasting sugar", "Kidney function", "Urine routine"],
    price: 3900,
    originalPrice: 5200,
  },
  {
    id: "heart-health",
    name: "Heart Health",
    description: "Understand your cardiovascular risk.",
    testCount: 31,
    includes: ["Lipid profile", "CBC", "Fasting sugar", "Kidney function"],
    price: 4500,
    originalPrice: 6300,
  },
];

export type BookableTest = Pick<
  LabTest,
  | "id"
  | "name"
  | "description"
  | "sampleType"
  | "turnaround"
  | "preparation"
  | "price"
>;

export function getBookableTest(id: string): BookableTest | undefined {
  const test = labTests.find((item) => item.id === id);
  if (test) return test;

  const labPackage = labPackages.find((item) => item.id === id);
  if (!labPackage) return undefined;

  return {
    id: labPackage.id,
    name: labPackage.name,
    description: `${labPackage.description} Includes ${labPackage.includes.join(", ")}.`,
    sampleType: "Blood & urine",
    turnaround: "48 hours",
    preparation: "Fast for 10–12 hours before sample collection.",
    price: labPackage.price,
  };
}
