import { HeartPulseIcon } from "lucide-react";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

type LogoProps = {
  inverted?: boolean;
  className?: string;
};

export function Logo({ inverted = false, className }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2 font-semibold", className)}
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <HeartPulseIcon className="size-4.5" aria-hidden />
      </span>
      <span
        className={cn(
          "text-lg tracking-tight",
          inverted ? "text-white" : "text-foreground",
        )}
      >
        {siteConfig.name}
      </span>
    </Link>
  );
}
