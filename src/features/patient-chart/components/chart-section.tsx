import type { ReactNode } from "react";

export function ChartSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <h4 className="text-xs font-medium text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}
