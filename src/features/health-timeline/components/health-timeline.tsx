import { HistoryIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PanelCard } from "@/components/shared/panel-card";
import { TimelineEntry } from "@/features/health-timeline/components/timeline-entry";
import { TimelineFilter } from "@/features/health-timeline/components/timeline-filter";
import {
  groupByMonth,
  timelineTypeLabels,
  type TimelineEntry as Entry,
  type TimelineType,
} from "@/features/health-timeline/lib/health-timeline";
import { formatMonthOfDateKey } from "@/lib/datetime";

type HealthTimelineProps = {
  entries: Entry[];
  type: TimelineType | null;
};

export function HealthTimeline({ entries, type }: HealthTimelineProps) {
  const shown = type ? entries.filter((entry) => entry.type === type) : entries;
  const months = groupByMonth(shown);

  return (
    <PanelCard
      title="Timeline"
      description="Your visits, prescriptions and documents, newest first."
    >
      <div className="grid gap-5 p-5">
        <TimelineFilter active={type} />
        {months.length === 0 ? (
          <EmptyState
            icon={HistoryIcon}
            title={
              type
                ? `No ${timelineTypeLabels[type].toLowerCase()} yet`
                : "Nothing here yet"
            }
            description="Visits appear once they've taken place, along with your prescriptions and the documents you upload."
          />
        ) : (
          months.map(({ month, entries: monthEntries }) => (
            <section key={month} aria-labelledby={`timeline-${month}`}>
              <h3
                id={`timeline-${month}`}
                className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {formatMonthOfDateKey(`${month}-01`)}
              </h3>
              <ol className="grid gap-4 border-l pl-4">
                {monthEntries.map((entry) => (
                  <TimelineEntry
                    key={`${entry.type}-${entry.id}`}
                    entry={entry}
                  />
                ))}
              </ol>
            </section>
          ))
        )}
      </div>
    </PanelCard>
  );
}
