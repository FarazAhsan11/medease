import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

type BackLinkProps = {
  href: string;
  children: string;
};

export function BackLink({ href, children }: BackLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeftIcon className="size-4" aria-hidden />
      {children}
    </Link>
  );
}
