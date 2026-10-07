import type { ReactNode } from "react";

type DetailListProps = {
  items: { label: string; value: ReactNode }[];
};

export function DetailList({ items }: DetailListProps) {
  return (
    <dl className="grid gap-3 text-sm">
      {items.map((item) => (
        <div key={item.label} className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="text-right font-medium">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
