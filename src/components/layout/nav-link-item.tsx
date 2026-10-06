import Link from "next/link";

import { cn } from "@/lib/utils";

type NavLinkItemProps = {
  href: string;
  title: string;
  className?: string;
};

export function NavLinkItem({ href, title, className }: NavLinkItemProps) {
  return (
    <li
      className={cn(
        "relative px-[15px] py-2.5 text-xl font-medium after:absolute after:-bottom-[5px] after:left-[60%] after:h-0.5 after:w-0 after:bg-ink after:transition-all after:duration-600 hover:after:left-0 hover:after:w-full",
        className,
      )}
    >
      <Link
        href={href}
        className="font-bold text-ink-body transition-colors duration-300"
      >
        {title}
      </Link>
    </li>
  );
}
