import { LockKeyholeIcon } from "lucide-react";
import Link from "next/link";

import { IconTile } from "@/components/shared/icon-tile";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SignInPromptProps = {
  title: string;
  description: string;
  // The signed-in page to continue to; guests are sent to log in first.
  href: string;
  className?: string;
};

export function SignInPrompt({
  title,
  description,
  href,
  className,
}: SignInPromptProps) {
  return (
    <div className={cn("@container rounded-2xl border bg-card p-5", className)}>
      <div className="flex flex-col gap-4 @md:flex-row @md:items-center">
        <IconTile icon={LockKeyholeIcon} />
        <div className="flex-1">
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={href}
            className={buttonVariants({ className: "h-9 flex-1 px-4" })}
          >
            Log in
          </Link>
          <Link
            href="/register"
            className={buttonVariants({
              variant: "outline",
              className: "h-9 flex-1 px-4",
            })}
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
