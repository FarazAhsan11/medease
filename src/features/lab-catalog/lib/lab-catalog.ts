// Lab catalog rules and labels (LAB-01, LAB-02), shared by the lab's catalog
// screens and the patient's browse pages. Safe to import from client
// components. The limits match the checks in *_lab_catalog.sql.

export const labTestCategories = [
  "blood",
  "diabetes",
  "heart",
  "thyroid",
  "liver_kidney",
  "vitamins",
  "infections",
  "hormones",
  "urine_stool",
] as const;

export type LabTestCategory = (typeof labTestCategories)[number];

export const categoryLabels: Record<LabTestCategory, string> = {
  blood: "Blood",
  diabetes: "Diabetes",
  heart: "Heart",
  thyroid: "Thyroid",
  liver_kidney: "Liver & kidney",
  vitamins: "Vitamins & minerals",
  infections: "Infections",
  hormones: "Hormones",
  urine_stool: "Urine & stool",
};

export function categoryLabel(category: string) {
  return categoryLabels[category as LabTestCategory] ?? category;
}

const sampleTypeLabels: Record<string, string> = {
  blood: "Blood",
  urine: "Urine",
  stool: "Stool",
};

export function sampleTypeLabel(sampleType: string) {
  return sampleTypeLabels[sampleType] ?? sampleType;
}

// What a lab can promise, from a few hours to two weeks.
export const TURNAROUND_HOURS = [
  4, 6, 12, 24, 48, 72, 96, 120, 168, 240, 336,
] as const;

export function formatTurnaround(hours: number) {
  if (hours >= 48 && hours % 24 === 0) return `${hours / 24} days`;
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

export const turnaroundOptions = TURNAROUND_HOURS.map((hours) => ({
  value: String(hours),
  label: formatTurnaround(hours),
}));

export const MAX_LAB_PRICE = 1_000_000;
export const MAX_LAB_PACKAGES = 50;
export const PACKAGE_TESTS = { min: 2, max: 30 } as const;

// The percentage a package saves on booking its tests one by one, if any.
export function packageSavings(price: number, separatePrice: number) {
  if (separatePrice <= 0 || price >= separatePrice) return null;
  const percent = Math.round((1 - price / separatePrice) * 100);
  return percent > 0 ? percent : null;
}

export const labCatalogErrorMessages: Record<string, string> = {
  not_lab: "Only lab accounts can change a test catalog.",
  not_permitted: "Only the lab admin can change the test catalog.",
  lab_not_found: "We couldn't find your lab's profile. Please contact support.",
  unknown_test: "That test isn't on our list. Choose another one.",
  test_not_found: "One of these tests isn't in your catalog. Reload the page.",
  package_size: `Choose between ${PACKAGE_TESTS.min} and ${PACKAGE_TESTS.max} tests.`,
  too_many_packages: `You can have up to ${MAX_LAB_PACKAGES} packages. Delete one first.`,
  package_not_found: "That package isn't there any more. Reload the page.",
};
