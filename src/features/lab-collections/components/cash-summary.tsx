import { BanknoteIcon } from "lucide-react";

import type { CashSummaryRow } from "@/features/lab-collections/lib/collections";
import { labRoleLabels } from "@/features/lab-staff/lib/lab-permissions";
import { formatFee } from "@/lib/format";

type CashSummaryProps = {
  rows: CashSummaryRow[];
  viewerId: string;
  // Those who see every booking get everyone's lines.
  everyone: boolean;
};

// Visits given for the day, and samples taken that day, which can include
// visits left over from earlier days.
const visitsLine = (row: CashSummaryRow) => {
  if (row.visits === 0 && row.collected === 0) return "No home visits";
  const collected = `${row.collected} collected`;
  if (row.visits === 0) return collected;
  return `${row.visits} home ${row.visits === 1 ? "visit" : "visits"} · ${collected}`;
};

const cashLine = (row: CashSummaryRow) =>
  row.cash_count === 0
    ? "no cash taken"
    : `${formatFee(row.cash_total)} cash from ${row.cash_count} ${row.cash_count === 1 ? "booking" : "bookings"}`;

// The day's totals: the viewer's own, and for the admin and front desk each
// person's, to count the cash handed in.
export function CashSummary({ rows, viewerId, everyone }: CashSummaryProps) {
  const own = rows.find((row) => row.user_id === viewerId);
  const others = everyone ? rows.filter((row) => row !== own) : [];
  const total = rows.reduce((sum, row) => sum + row.cash_total, 0);

  return (
    <section
      aria-labelledby="cash-summary-heading"
      className="grid gap-3 rounded-2xl border bg-card p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="cash-summary-heading"
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <BanknoteIcon className="size-4 text-muted-foreground" aria-hidden />
          {everyone ? "The day's visits and cash" : "Your day"}
        </h2>
        {everyone && (
          <p className="text-sm font-semibold">{formatFee(total)}</p>
        )}
      </div>
      <p className="text-sm">
        {own
          ? `${visitsLine(own)} · ${cashLine(own)}`
          : "No home visits and no cash taken by you."}
      </p>
      {others.length > 0 && (
        <ul className="grid gap-2 border-t pt-3 text-sm">
          {others.map((row) => (
            <li
              key={row.user_id ?? "former"}
              className="flex flex-wrap items-baseline justify-between gap-x-3"
            >
              <span className="min-w-0 break-words">
                <span className="font-medium">
                  {row.user_id === null
                    ? "Former staff"
                    : row.full_name?.trim() || "Unnamed"}
                </span>
                {row.role && (
                  <span className="text-xs text-muted-foreground">
                    {" "}
                    · {labRoleLabels[row.role]}
                  </span>
                )}
                <span className="block text-xs text-muted-foreground">
                  {visitsLine(row)}
                </span>
              </span>
              <span className="shrink-0 font-medium">
                {formatFee(row.cash_total)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
