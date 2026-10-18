import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HeaderAuthActionsProps = {
  layout?: "inline" | "stacked";
  onNavigate?: () => void;
};

export function HeaderAuthActions({
  layout = "inline",
  onNavigate,
}: HeaderAuthActionsProps) {
  const stacked = layout === "stacked";

  return (
    <div className={cn("flex items-center gap-2", stacked && "grid")}>
      <Link
        href="/login"
        onClick={onNavigate}
        className={cn(
          buttonVariants({ variant: stacked ? "outline" : "ghost" }),
          "h-9",
        )}
      >
        Log in
      </Link>
      <Link
        href="/register"
        onClick={onNavigate}
        className={cn(buttonVariants(), "h-9")}
      >
        Get started
      </Link>
    </div>
  );
}
