import { PackageIcon, SearchXIcon, TestTubesIcon } from "lucide-react";
import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchForm } from "@/components/shared/search-form";
import { labRoutes } from "@/config/routes";
import { CatalogPackageCard } from "@/features/lab-catalog/components/catalog-package-card";
import { LabPackageSheet } from "@/features/lab-catalog/components/lab-package-sheet";
import { LabTestSheet } from "@/features/lab-catalog/components/lab-test-sheet";
import { LabTestsTable } from "@/features/lab-catalog/components/lab-tests-table";
import {
  getLabCatalog,
  getLabTestTypes,
} from "@/features/lab-catalog/data/lab-catalog";
import {
  MAX_LAB_PACKAGES,
  PACKAGE_TESTS,
} from "@/features/lab-catalog/lib/lab-catalog";
import { getLabVerification } from "@/features/lab-verification/data/lab-verification";
import { requireLabMember } from "@/features/lab-staff/lib/lab-member.server";

export const metadata: Metadata = {
  title: "Test catalog",
};

export default async function LabTestsCatalogPage({
  searchParams,
}: PageProps<"/lab/tests">) {
  const { labId } = await requireLabMember("catalog");
  const [{ q }, { tests, packages }, testTypes, verification] =
    await Promise.all([
      searchParams,
      getLabCatalog(labId),
      getLabTestTypes(),
      getLabVerification(labId),
    ]);

  const query = (typeof q === "string" ? q : "").trim().slice(0, 80);
  const shownTests = query
    ? tests.filter((test) => test.searchText.includes(query.toLowerCase()))
    : tests;
  const offered = new Set(tests.map((test) => test.testTypeId));
  const newTestTypes = testTypes.filter((type) => !offered.has(type.id));

  return (
    <>
      <DashboardPageHeader
        title="Test catalog"
        description={
          verification?.status === "approved"
            ? "Tests and packages patients can find and compare."
            : "Set up your tests and prices now. Patients see them once your lab is verified."
        }
        actions={<LabTestSheet testTypes={newTestTypes} />}
      />

      {tests.length === 0 ? (
        <EmptyState
          icon={TestTubesIcon}
          title="No tests yet"
          description="Add the tests you offer, with your price and how soon results are ready."
        />
      ) : (
        <section className="space-y-4">
          <SearchForm
            action={labRoutes.tests}
            defaultValue={query}
            label="Search your tests"
            placeholder="Search your tests"
            className="max-w-sm"
          />
          {shownTests.length === 0 ? (
            <EmptyState
              icon={SearchXIcon}
              title="No matching tests"
              description="Try another name, or clear the search."
            />
          ) : (
            <LabTestsTable tests={shownTests} />
          )}
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">Packages</h2>
            <p className="text-sm text-muted-foreground">
              {PACKAGE_TESTS.min} or more of your tests at one price.
            </p>
          </div>
          <LabPackageSheet
            tests={tests}
            disabled={
              tests.length < PACKAGE_TESTS.min ||
              packages.length >= MAX_LAB_PACKAGES
            }
          />
        </div>
        {packages.length === 0 ? (
          <EmptyState
            icon={PackageIcon}
            title="No packages yet"
            description={
              tests.length < PACKAGE_TESTS.min
                ? "Add at least two tests, then group them into a package."
                : "Group tests patients often book together, such as a yearly checkup."
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {packages.map((labPackage) => (
              <CatalogPackageCard
                key={labPackage.id}
                labPackage={labPackage}
                tests={tests}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
