import { cn } from "@/lib/utils";

type DoctorsPaginationProps = {
  totalPages: number;
  currentPage: number;
};

const navButtonClass =
  "rounded bg-surface-call px-3 py-2 text-sm text-ink-body transition-colors duration-200 enabled:hover:bg-white disabled:text-ink-disabled max-[480px]:px-2.5 max-[480px]:py-1.5";

export function DoctorsPagination({
  totalPages,
  currentPage,
}: DoctorsPaginationProps) {
  return (
    <nav
      aria-label="Pagination"
      className="mt-5 flex items-center justify-center gap-2"
    >
      <button
        type="button"
        disabled={currentPage === 1}
        className={navButtonClass}
      >
        Previous
      </button>
      {Array.from({ length: totalPages }, (_, index) => index + 1).map(
        (page) => (
          <button
            key={page}
            type="button"
            aria-current={page === currentPage ? "page" : undefined}
            className={cn(
              "rounded px-3 py-2 text-sm font-semibold transition-colors duration-200 max-[480px]:px-2.5 max-[480px]:py-1.5",
              page === currentPage
                ? "bg-white text-black"
                : "bg-brand-sky text-ink-body hover:bg-line-soft",
            )}
          >
            {page}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={currentPage === totalPages}
        className={navButtonClass}
      >
        Next
      </button>
    </nav>
  );
}
