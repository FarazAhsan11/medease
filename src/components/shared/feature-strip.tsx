import type { LucideIcon } from "lucide-react";

import { IconTile } from "@/components/shared/icon-tile";

type FeatureStripProps = {
  items: { icon: LucideIcon; title: string; description: string }[];
};

export function FeatureStrip({ items }: FeatureStripProps) {
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <li
          key={item.title}
          className="flex items-center gap-3 rounded-2xl border bg-card p-4"
        >
          <IconTile icon={item.icon} />
          <div>
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
