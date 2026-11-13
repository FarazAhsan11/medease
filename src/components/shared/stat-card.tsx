import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { IconTile } from "@/components/shared/icon-tile";

export type Stat = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  // Where the number comes from, when there's a page for it.
  href?: string;
};

type StatCardProps = {
  stat: Stat;
};

export function StatCard({ stat }: StatCardProps) {
  const content = (
    <>
      <div>
        <p className="text-sm text-muted-foreground">{stat.label}</p>
        <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
      </div>
      <IconTile icon={stat.icon} size="sm" />
    </>
  );
  const className =
    "flex items-start justify-between gap-3 rounded-2xl border bg-card p-5";

  return stat.href ? (
    <Link
      href={stat.href}
      className={`${className} transition-colors hover:border-primary/40`}
    >
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
