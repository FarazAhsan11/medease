import type { Metadata } from "next";

import { DashboardPageHeader } from "@/components/shared/dashboard-page-header";
import { ResultsInboxList } from "@/features/lab-orders/components/results-inbox-list";
import { ResultsInboxTabs } from "@/features/lab-orders/components/results-inbox-tabs";
import {
  countResultsToReview,
  getResultsInbox,
} from "@/features/lab-orders/data/lab-orders";
import { parseInboxCursor } from "@/features/lab-orders/lib/lab-orders";
import { requireRole } from "@/lib/auth/session";
import { searchParam } from "@/lib/directory-search";

export const metadata: Metadata = {
  title: "Lab results",
};

// Reports from every test this doctor ordered, still to review first (PRC-11).
export default async function DoctorLabResultsPage({
  searchParams,
}: PageProps<"/doctor/lab-results">) {
  const params = await searchParams;
  const reviewed = searchParam(params.view) === "reviewed";
  const cursor = parseInboxCursor(searchParam(params.after));
  await requireRole("doctor");
  const [{ results, more }, toReview] = await Promise.all([
    getResultsInbox(reviewed, cursor),
    countResultsToReview(),
  ]);

  return (
    <>
      <DashboardPageHeader
        title="Lab results"
        description="Reports for the tests you order come here as labs publish them. Open each one and mark it reviewed, with a comment for the patient if you like."
      />
      <ResultsInboxTabs reviewed={reviewed} toReview={toReview} />
      <ResultsInboxList
        results={results}
        reviewed={reviewed}
        more={more}
        paged={cursor !== null}
        now={new Date()}
      />
    </>
  );
}
