import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import type { DoctorSearch } from "@/features/doctors/data/doctor-directory";
import { cn } from "@/lib/utils";

type DoctorsPaginationProps = {
  basePath: string;
  search: DoctorSearch;
  totalPages: number;
};

function pageHref(basePath: string, search: DoctorSearch, page: number) {
  const params = new URLSearchParams();
  for (const key of ["q", "specialty", "gender", "city"] as const) {
    if (search[key]) params.set(key, search[key]);
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function DoctorsPagination({
  basePath,
  search,
  totalPages,
}: DoctorsPaginationProps) {
  if (totalPages <= 1) return null;

  const current = Math.min(search.page, totalPages);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const edge = (page: number, label: string, icon: ReactNode) =>
    page < 1 || page > totalPages ? (
      <span
        aria-disabled
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "pointer-events-none gap-1 opacity-50",
        )}
      >
        {label === "Next" ? null : icon}
        {label}
        {label === "Next" ? icon : null}
      </span>
    ) : (
      <Link
        href={pageHref(basePath, search, page)}
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "gap-1",
        })}
      >
        {label === "Next" ? null : icon}
        {label}
        {label === "Next" ? icon : null}
      </Link>
    );

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex items-center justify-center gap-1"
    >
      {edge(current - 1, "Previous", <ChevronLeftIcon aria-hidden />)}
      {pages.map((page) => (
        <Link
          key={page}
          href={pageHref(basePath, search, page)}
          aria-current={page === current ? "page" : undefined}
          className={buttonVariants({
            size: "icon-sm",
            variant: page === current ? "default" : "ghost",
          })}
        >
          {page}
        </Link>
      ))}
      {edge(current + 1, "Next", <ChevronRightIcon aria-hidden />)}
    </nav>
  );
}
