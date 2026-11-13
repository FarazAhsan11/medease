import Link from "next/link";

import { doctorRoutes } from "@/config/routes";
import { cn } from "@/lib/utils";

type ResultsInboxTabsProps = {
  reviewed: boolean;
  // Reports still to review.
  toReview: number;
};

// The inbox's two lists: still to review, and reviewed.
export function ResultsInboxTabs({
  reviewed,
  toReview,
}: ResultsInboxTabsProps) {
  const tabs = [
    { label: "To review", href: doctorRoutes.labResults, current: !reviewed },
    {
      label: "Reviewed",
      href: `${doctorRoutes.labResults}?view=reviewed`,
      current: reviewed,
    },
  ];

  return (
    <nav aria-label="Lab results" className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((tab, index) => (
        <Link
          key={tab.label}
          href={tab.href}
          aria-current={tab.current ? "page" : undefined}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
            tab.current
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          {tab.label}
          {index === 0 && toReview > 0 && (
            <span
              className={cn(
                "rounded-full px-1.5 text-xs",
                tab.current
                  ? "bg-primary-foreground/20"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {toReview}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
