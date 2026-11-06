import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";

type BadgeListProps = {
  label: string;
  items: string[];
  tone: StatusTone;
  // Shown when the list is empty.
  empty: string;
};

// A labelled list of short items, such as allergies, one badge each.
export function BadgeList({ label, items, tone, empty }: BadgeListProps) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      {items.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <StatusBadge key={item} tone={tone}>
              {item}
            </StatusBadge>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm font-medium">{empty}</p>
      )}
    </div>
  );
}
