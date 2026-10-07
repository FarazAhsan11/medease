import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { IconTile } from "@/components/shared/icon-tile";
import { quickActions } from "@/features/patient-dashboard/data/overview";

export function QuickActions() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {quickActions.map((action) => (
        <Link
          key={action.title}
          href={action.href}
          className="group flex items-center gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-secondary/40"
        >
          <IconTile icon={action.icon} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{action.title}</span>
            <span className="block text-xs text-muted-foreground">
              {action.description}
            </span>
          </span>
          <ChevronRightIcon
            className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      ))}
    </div>
  );
}
