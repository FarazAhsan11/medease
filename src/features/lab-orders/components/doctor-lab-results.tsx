import { PanelCard } from "@/components/shared/panel-card";
import { LabResultEntry } from "@/features/lab-orders/components/lab-result-entry";
import {
  remainingTests,
  type LabOrder,
  type OrderResult,
} from "@/features/lab-orders/lib/lab-orders";

type DoctorLabResultsProps = {
  order: LabOrder;
  results: OrderResult[];
};

// Where the patient booked the doctor's order, and the reports as they come
// in (LAB-08).
export function DoctorLabResults({ order, results }: DoctorLabResultsProps) {
  if (order.status !== "active" && results.length === 0) return null;
  const waiting = remainingTests(order, results);

  return (
    <PanelCard
      title="Bookings and results"
      description="Reports for these tests come to you as the lab publishes them."
      className="max-w-2xl"
    >
      <div className="grid gap-4 p-5">
        {results.length > 0 ? (
          <ul className="grid gap-3">
            {results.map((result) => (
              <LabResultEntry
                key={result.bookingId}
                order={order}
                result={result}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            The patient hasn&apos;t booked these tests yet.
          </p>
        )}
        {results.length > 0 &&
          waiting.length > 0 &&
          order.status === "active" && (
            <p className="text-xs text-muted-foreground">
              Not booked yet: {waiting.map((test) => test.name).join(", ")}
            </p>
          )}
      </div>
    </PanelCard>
  );
}
