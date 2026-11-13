import { ChevronRightIcon, FlaskConicalIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { doctorRoutes } from "@/config/routes";
import { ResultsInboxItem } from "@/features/lab-orders/components/results-inbox-item";
import {
  inboxCursor,
  type InboxResult,
} from "@/features/lab-orders/lib/lab-orders";

type ResultsInboxListProps = {
  results: InboxResult[];
  reviewed: boolean;
  // Whether there's another page after this one.
  more: boolean;
  // Whether this page started from a cursor.
  paged: boolean;
  now: Date;
};

const pageHref = (reviewed: boolean, after?: string) => {
  const search = new URLSearchParams();
  if (reviewed) search.set("view", "reviewed");
  if (after) search.set("after", after);
  const query = search.toString();
  return query
    ? `${doctorRoutes.labResults}?${query}`
    : doctorRoutes.labResults;
};

// One page of the inbox, with a link to the next.
export function ResultsInboxList({
  results,
  reviewed,
  more,
  paged,
  now,
}: ResultsInboxListProps) {
  const last = results.at(-1);

  if (results.length === 0) {
    return (
      <EmptyState
        icon={FlaskConicalIcon}
        title={
          paged
            ? "No more results"
            : reviewed
              ? "No reviewed results yet"
              : "Nothing to review"
        }
        description={
          reviewed
            ? "Reports you've reviewed are kept here."
            : "Reports for tests you order come here as labs publish them."
        }
        action={
          paged && (
            <Link
              href={pageHref(reviewed)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Back to the start
            </Link>
          )
        }
      />
    );
  }

  return (
    <div className="grid max-w-3xl gap-4">
      <ul className="grid gap-4">
        {results.map((result) => (
          <ResultsInboxItem key={result.reportId} result={result} now={now} />
        ))}
      </ul>
      {(more || paged) && (
        <nav
          aria-label="More results"
          className="flex flex-wrap items-center justify-between gap-2"
        >
          {paged ? (
            <Link
              href={pageHref(reviewed)}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Back to the start
            </Link>
          ) : (
            <span />
          )}
          {more && last && (
            <Link
              href={pageHref(reviewed, inboxCursor(last, reviewed))}
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "gap-1",
              })}
            >
              {reviewed ? "Older results" : "Next results"}
              <ChevronRightIcon aria-hidden />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
