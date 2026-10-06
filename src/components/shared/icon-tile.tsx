import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const tones = {
  brand: "bg-secondary text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  muted: "bg-muted text-muted-foreground",
  solid: "bg-primary text-primary-foreground",
};

const sizes = {
  sm: "size-8 rounded-lg [&_svg]:size-4",
  md: "size-10 rounded-xl [&_svg]:size-5",
  lg: "size-12 rounded-xl [&_svg]:size-6",
};

type IconTileProps = {
  icon: LucideIcon;
  tone?: keyof typeof tones;
  size?: keyof typeof sizes;
  className?: string;
};

export function IconTile({
  icon: Icon,
  tone = "brand",
  size = "md",
  className,
}: IconTileProps) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center",
        tones[tone],
        sizes[size],
        className,
      )}
    >
      <Icon aria-hidden />
    </span>
  );
}
