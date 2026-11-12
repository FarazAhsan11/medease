import type { LabOrder } from "@/features/lab-orders/lib/lab-orders";

// The ordered tests and the doctor's note.
export function LabOrderTests({
  order,
}: {
  order: Pick<LabOrder, "tests" | "note">;
}) {
  return (
    <div className="grid gap-2 text-sm">
      <ul className="flex flex-wrap gap-1.5">
        {order.tests.map((test) => (
          <li
            key={test.id}
            className="rounded-full border bg-card px-2.5 py-0.5 text-xs"
          >
            {test.name}
          </li>
        ))}
      </ul>
      {order.note && (
        <p className="whitespace-pre-line text-muted-foreground">
          {order.note}
        </p>
      )}
    </div>
  );
}
