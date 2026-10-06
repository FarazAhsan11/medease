import { StarIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type RatingBadgeProps = {
  rating: number;
  className?: string;
};

export function RatingBadge({ rating, className }: RatingBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning",
        className,
      )}
    >
      <StarIcon className="size-3 fill-current" aria-hidden />
      {rating.toFixed(1)}
      <span className="sr-only">out of 5</span>
    </span>
  );
}
