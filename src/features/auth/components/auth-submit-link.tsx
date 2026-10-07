import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AuthSubmitLinkProps = {
  href: string;
  children: string;
};

// UI-only stand-in for the submit button until auth is wired up.
export function AuthSubmitLink({ href, children }: AuthSubmitLinkProps) {
  return (
    <Link href={href} className={cn(buttonVariants(), "mt-2 h-9 w-full")}>
      {children}
    </Link>
  );
}
