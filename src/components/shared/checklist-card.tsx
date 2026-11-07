import { CheckCircle2Icon, CircleIcon } from "lucide-react";
import Link from "next/link";

import { PanelCard } from "@/components/shared/panel-card";
import { cn } from "@/lib/utils";

export type ChecklistItem = {
  label: string;
  done: boolean;
  // Shown while the item is to do, or always with `always`.
  link?: { href: string; label: string; always?: boolean };
};

export function ChecklistCard({
  title,
  items,
}: {
  title: string;
  items: ChecklistItem[];
}) {
  return (
    <PanelCard title={title} className="h-fit">
      <ul className="grid gap-3 p-5 text-sm">
        {items.map((item) => {
          const Icon = item.done ? CheckCircle2Icon : CircleIcon;

          return (
            <li key={item.label} className="flex items-center gap-2.5">
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  item.done ? "text-success" : "text-muted-foreground",
                )}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                {item.label}
                <span className="sr-only">
                  {item.done ? " (done)" : " (to do)"}
                </span>
              </span>
              {item.link && (!item.done || item.link.always) && (
                <Link
                  href={item.link.href}
                  className="text-xs text-primary hover:underline"
                >
                  {item.link.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </PanelCard>
  );
}
