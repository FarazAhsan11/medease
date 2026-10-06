import { StarIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type StarRatingProps = {
  value: number;
  max?: number;
};

export function StarRating({ value, max = 5 }: StarRatingProps) {
  return (
    <span
      className="flex items-center gap-0.5"
      aria-label={`${value} of ${max} stars`}
    >
      {Array.from({ length: max }, (_, index) => (
        <StarIcon
          key={index}
          aria-hidden
          className={cn(
            "size-3.5",
            index < value
              ? "fill-warning text-warning"
              : "fill-muted text-muted",
          )}
        />
      ))}
    </span>
  );
}
