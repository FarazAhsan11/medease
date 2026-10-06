import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type DoctorsPaginationProps = {
  totalPages: number;
  currentPage: number;
};

export function DoctorsPagination({
  totalPages,
  currentPage,
}: DoctorsPaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex items-center justify-center gap-1"
    >
      <Button
        variant="ghost"
        size="sm"
        disabled={currentPage === 1}
        className="gap-1"
      >
        <ChevronLeftIcon aria-hidden />
        Previous
      </Button>
      {pages.map((page) => (
        <Button
          key={page}
          size="icon-sm"
          variant={page === currentPage ? "default" : "ghost"}
          aria-current={page === currentPage ? "page" : undefined}
        >
          {page}
        </Button>
      ))}
      <Button
        variant="ghost"
        size="sm"
        disabled={currentPage === totalPages}
        className="gap-1"
      >
        Next
        <ChevronRightIcon aria-hidden />
      </Button>
    </nav>
  );
}
