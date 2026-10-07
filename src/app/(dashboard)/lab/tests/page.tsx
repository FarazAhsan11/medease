import { PlusIcon, SearchIcon } from "lucide-react";
import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TestCatalogTable } from "@/features/lab-dashboard/components/test-catalog-table";
import { labTests } from "@/features/lab-tests/data/lab-tests";

export const metadata: Metadata = {
  title: "Test catalog",
};

const unlistedTestIds = ["urine-re"];

export default function LabTestsCatalogPage() {
  return (
    <>
      <DashboardPageHeader
        title="Test catalog"
        description="Tests and prices patients can book with your lab."
        actions={
          <Button className="h-9 gap-1.5 px-4">
            <PlusIcon aria-hidden />
            Add test
          </Button>
        }
      />
      <div className="relative max-w-sm">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          aria-label="Search tests"
          placeholder="Search tests"
          className="h-9 bg-card pl-9"
        />
      </div>
      <TestCatalogTable tests={labTests} inactiveIds={unlistedTestIds} />
    </>
  );
}
