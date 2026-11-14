import { StatusBadge } from "@/components/shared/status-badge";
import {
  reasonLabels,
  type StatusReason,
} from "@/features/lab-booking/lib/lab-bookings";
import {
  sampleTypeLabels,
  type LabSampleDetail,
} from "@/features/lab-samples/lib/samples";
import { formatDateTime } from "@/lib/datetime";

type SampleListProps = {
  samples: LabSampleDetail[];
  timezone: string;
};

// Every container the booking has had: the current ones, and rejected ones
// kept with why, so a code found on an old tube can still be traced.
export function SampleList({ samples, timezone }: SampleListProps) {
  if (samples.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No codes yet. They&apos;re made when labels are printed or the sample
        is marked collected.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-2xl border bg-card">
      {samples.map((sample) => (
        <li
          key={sample.code}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm"
        >
          <span className="min-w-0">
            <span className="font-mono font-medium">{sample.code}</span>
            <span className="text-muted-foreground">
              {" "}
              · {sampleTypeLabels[sample.sample_type]}
            </span>
          </span>
          <SampleState sample={sample} timezone={timezone} />
        </li>
      ))}
    </ul>
  );
}

function SampleState({
  sample,
  timezone,
}: {
  sample: LabSampleDetail;
  timezone: string;
}) {
  if (sample.rejected_at) {
    const reason = sample.rejection_reason
      ? reasonLabels[sample.rejection_reason as StatusReason]
      : null;
    return (
      <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <StatusBadge tone="muted">Rejected</StatusBadge>
        {[reason, formatDateTime(sample.rejected_at, timezone)]
          .filter(Boolean)
          .join(" · ")}
      </span>
    );
  }
  if (sample.collected_at) {
    return (
      <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <StatusBadge tone="info">Collected</StatusBadge>
        {formatDateTime(sample.collected_at, timezone)}
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <StatusBadge tone="muted">Label printed</StatusBadge>
      {formatDateTime(sample.created_at, timezone)}
    </span>
  );
}
