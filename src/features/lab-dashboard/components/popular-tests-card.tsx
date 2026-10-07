import { PanelCard } from "@/components/shared/panel-card";
import { popularTests } from "@/features/lab-dashboard/data/lab-dashboard";

export function PopularTestsCard() {
  return (
    <PanelCard title="Most booked this month">
      <ol className="grid gap-3 p-5">
        {popularTests.map((test, index) => (
          <li key={test.name} className="flex items-center gap-3 text-sm">
            <span className="flex size-6 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
              {index + 1}
            </span>
            <span className="flex-1">{test.name}</span>
            <span className="text-muted-foreground">{test.bookings}</span>
          </li>
        ))}
      </ol>
    </PanelCard>
  );
}
