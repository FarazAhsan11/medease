import { SearchXIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PaginationLinks } from "@/components/shared/pagination-links";
import { SearchForm } from "@/components/shared/search-form";
import { buttonVariants } from "@/components/ui/button";
import { LabPackageCard } from "@/features/lab-tests/components/lab-package-card";
import { LabTestCard } from "@/features/lab-tests/components/lab-test-card";
import { LabTestCategoryLinks } from "@/features/lab-tests/components/lab-test-category-links";
import {
  PACKAGES_CATEGORY,
  searchLabPackages,
  searchLabTests,
  type LabTestSearch,
} from "@/features/lab-tests/data/lab-test-catalog";

type LabTestDirectoryProps = {
  // The page this directory sits on: public or the patient's own.
  basePath: string;
  // Where one test's comparison opens.
  testHref: (testId: string) => string;
  search: LabTestSearch;
};

export async function LabTestDirectory({
  basePath,
  testHref,
  search,
}: LabTestDirectoryProps) {
  const showPackages = search.category === PACKAGES_CATEGORY;
  const result = showPackages
    ? await searchLabPackages(search)
    : await searchLabTests(search);
  const items =
    "packages" in result
      ? result.packages.map((labPackage) => (
          <LabPackageCard key={labPackage.id} labPackage={labPackage} />
        ))
      : result.tests.map((test) => (
          <LabTestCard key={test.id} test={test} href={testHref(test.id)} />
        ));
  const filtered = Boolean(search.q || search.category);

  return (
    <div className="space-y-5">
      <SearchForm
        action={basePath}
        defaultValue={search.q}
        label={showPackages ? "Search packages" : "Search tests"}
        placeholder={
          showPackages
            ? "Search packages, e.g. full body"
            : "Search tests, e.g. vitamin D or sugar"
        }
        keep={{ category: search.category }}
        className="max-w-md"
      />
      <LabTestCategoryLinks
        basePath={basePath}
        active={search.category}
        q={search.q}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={SearchXIcon}
          title={
            filtered
              ? `No ${showPackages ? "packages" : "tests"} found`
              : "No labs listed yet"
          }
          description={
            filtered
              ? "Try another name or category."
              : "Verified labs will list their tests and prices here soon."
          }
          action={
            filtered ? (
              <Link
                href={basePath}
                className={buttonVariants({ variant: "outline" })}
              >
                Show all tests
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {result.total} {showPackages ? "package" : "test"}
            {result.total === 1 ? "" : "s"}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items}
          </div>
        </>
      )}

      <PaginationLinks
        basePath={basePath}
        params={{ q: search.q, category: search.category }}
        page={result.page}
        totalPages={result.totalPages}
      />
    </div>
  );
}
