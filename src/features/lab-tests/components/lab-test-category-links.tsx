import Link from "next/link";

import {
  categoryLabels,
  labTestCategories,
} from "@/features/lab-catalog/lib/lab-catalog";
import { PACKAGES_CATEGORY } from "@/features/lab-tests/data/lab-test-catalog";
import { cn } from "@/lib/utils";

const choices = [
  { value: "", label: "All tests" },
  { value: PACKAGES_CATEGORY, label: "Packages" },
  ...labTestCategories.map((category) => ({
    value: category,
    label: categoryLabels[category],
  })),
];

type LabTestCategoryLinksProps = {
  basePath: string;
  active: string;
  // The search box's text, kept when changing category.
  q: string;
};

export function LabTestCategoryLinks({
  basePath,
  active,
  q,
}: LabTestCategoryLinksProps) {
  const href = (category: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <nav
      aria-label="Test categories"
      className="flex gap-2 overflow-x-auto pb-1"
    >
      {choices.map(({ value, label }) => (
        <Link
          key={value || "all"}
          href={href(value)}
          aria-current={value === active ? "page" : undefined}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
            value === active
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
