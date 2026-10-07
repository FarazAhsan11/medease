import { LabPackageCard } from "@/features/lab-tests/components/lab-package-card";
import { LabTestCatalog } from "@/features/lab-tests/components/lab-test-catalog";
import { labPackages, labTests } from "@/features/lab-tests/data/lab-tests";

export function LabTestDirectory() {
  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-lg font-semibold">Popular health packages</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {labPackages.map((labPackage, index) => (
            <LabPackageCard
              key={labPackage.id}
              labPackage={labPackage}
              featured={index === 0}
            />
          ))}
        </div>
      </section>
      <LabTestCatalog tests={labTests} />
    </div>
  );
}
