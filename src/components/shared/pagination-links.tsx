import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaginationLinksProps = {
  basePath: string;
  // The page's other search parameters, kept on every link.
  params: Record<string, string>;
  page: number;
  totalPages: number;
};

function pageHref(
  basePath: string,
  params: Record<string, string>,
  page: number,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

// Numbered page links for a list whose filters live in the URL.
export function PaginationLinks({
  basePath,
  params,
  page,
  totalPages,
}: PaginationLinksProps) {
  if (totalPages <= 1) return null;

  const current = Math.min(page, totalPages);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const edge = (target: number, label: string, icon: ReactNode) => {
    const content =
      label === "Next" ? (
        <>
          {label}
          {icon}
        </>
      ) : (
        <>
          {icon}
          {label}
        </>
      );

    return target < 1 || target > totalPages ? (
      <span
        aria-disabled
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "pointer-events-none gap-1 opacity-50",
        )}
      >
        {content}
      </span>
    ) : (
      <Link
        href={pageHref(basePath, params, target)}
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "gap-1",
        })}
      >
        {content}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex flex-wrap items-center justify-center gap-1"
    >
      {edge(current - 1, "Previous", <ChevronLeftIcon aria-hidden />)}
      {pages.map((number) => (
        <Link
          key={number}
          href={pageHref(basePath, params, number)}
          aria-current={number === current ? "page" : undefined}
          className={buttonVariants({
            size: "icon-sm",
            variant: number === current ? "default" : "ghost",
          })}
        >
          {number}
        </Link>
      ))}
      {edge(current + 1, "Next", <ChevronRightIcon aria-hidden />)}
    </nav>
  );
}
