import { LayoutDashboardIcon } from "lucide-react";
import Link from "next/link";

import { UserAvatar } from "@/components/shared/user-avatar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type HeaderAccount = {
  name: string;
  dashboardHref: string;
};

type HeaderAccountActionsProps = {
  account: HeaderAccount | null;
  layout?: "inline" | "stacked";
  onNavigate?: () => void;
};

export function HeaderAccountActions({
  account,
  layout = "inline",
  onNavigate,
}: HeaderAccountActionsProps) {
  const stacked = layout === "stacked";

  if (account) {
    return (
      <div className={cn("flex items-center gap-3", stacked && "grid")}>
        <span className="flex items-center gap-2">
          <UserAvatar name={account.name} className="size-8" />
          <span className="text-sm font-medium">{account.name}</span>
        </span>
        <Link
          href={account.dashboardHref}
          onClick={onNavigate}
          className={cn(buttonVariants(), "h-9 gap-1.5")}
        >
          <LayoutDashboardIcon aria-hidden />
          Go to dashboard
        </Link>
      </div>
    );
  }

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
