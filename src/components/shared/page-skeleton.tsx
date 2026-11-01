import { Skeleton } from "@/components/ui/skeleton";

type PageSkeletonProps = {
  variant?: "page" | "list" | "cards" | "detail" | "form";
};

function HeadingSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-56 max-w-full" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
  );
}

function PanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border bg-card">
      <div className="border-b px-5 py-4">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-3 px-5 py-4">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldsSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2">
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <Skeleton className="hidden h-72 rounded-2xl lg:block" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-52 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

// Shown the moment a link is clicked, in the shape of the page on its way.
export function PageSkeleton({ variant = "page" }: PageSkeletonProps) {
  return (
    <div role="status" aria-label="Loading" className="space-y-6">
      {variant === "detail" ? (
        <>
          <Skeleton className="h-4 w-32" />
          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <Skeleton className="h-96 rounded-2xl" />
            <FieldsSkeleton />
          </div>
        </>
      ) : (
        <HeadingSkeleton />
      )}

      {variant === "page" && (
        <>
          <Skeleton className="h-28 rounded-2xl" />
          <PanelSkeleton />
        </>
      )}
      {variant === "list" && <PanelSkeleton rows={4} />}
      {variant === "cards" && (
        <>
          <Skeleton className="h-14 rounded-2xl" />
          <CardsSkeleton />
        </>
      )}
      {variant === "form" && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <FieldsSkeleton fields={8} />
          <FieldsSkeleton fields={2} />
        </div>
      )}
    </div>
  );
}
