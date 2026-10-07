import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PanelCardProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function PanelCard({
  title,
  description,
  action,
  className,
  children,
}: PanelCardProps) {
  return (
    <section className={cn("rounded-2xl border bg-card", className)}>
      <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
