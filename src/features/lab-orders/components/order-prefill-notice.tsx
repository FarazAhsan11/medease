import { FlaskConicalIcon } from "lucide-react";

import type { LabOrderWithVisit } from "@/features/lab-orders/data/lab-orders";
import type { LabOrderTest } from "@/features/lab-orders/lib/lab-orders";

type OrderPrefillNoticeProps = {
  order: LabOrderWithVisit;
  // Ordered tests this lab doesn't do.
  notOffered: LabOrderTest[];
};

// On the booking page opened from a doctor's order: what was chosen for the
// patient, and what to book elsewhere.
export function OrderPrefillNotice({
  order,
  notOffered,
}: OrderPrefillNoticeProps) {
  const offeredNone = notOffered.length === order.tests.length;
  const forWhom =
    order.visit.careRecipientRelation !== "self"
      ? `, for ${order.visit.careRecipientName}`
      : "";

  return (
    <div className="flex items-start gap-3 rounded-2xl border bg-secondary p-4 text-sm text-secondary-foreground">
      <FlaskConicalIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="grid gap-1">
        <p>
          {offeredNone
            ? `This lab doesn't do any of the tests ${order.visit.doctorName} ordered${forWhom}. Go back to compare labs that do.`
            : `The tests ${order.visit.doctorName} ordered that this lab does are chosen for you${forWhom}.`}
        </p>
        {notOffered.length > 0 && !offeredNone && (
          <p>
            <span className="font-medium">Book elsewhere:</span>{" "}
            {notOffered.map((test) => test.name).join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
