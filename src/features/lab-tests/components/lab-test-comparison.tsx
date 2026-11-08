import { LabOfferList } from "@/features/lab-tests/components/lab-offer-list";
import { LabTestSummary } from "@/features/lab-tests/components/lab-test-summary";
import type {
  LabTestDetails,
  LabTestOffers,
} from "@/features/lab-tests/data/lab-test-catalog";

type LabTestComparisonProps = {
  test: LabTestDetails;
  offers: LabTestOffers;
};

// One test and every verified lab offering it, for guests and patients alike.
export function LabTestComparison({ test, offers }: LabTestComparisonProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <LabTestSummary test={test} />
      <LabOfferList
        offers={offers.offers}
        total={offers.total}
        sharedPreparation={test.preparation}
      />
    </div>
  );
}
