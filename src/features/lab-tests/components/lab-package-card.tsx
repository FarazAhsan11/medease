import { CheckIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { LabPackage } from "@/features/lab-tests/data/lab-tests";
import { formatFee } from "@/lib/format";
import { cn } from "@/lib/utils";

type LabPackageCardProps = {
  labPackage: LabPackage;
  featured?: boolean;
};

export function LabPackageCard({
  labPackage,
  featured = false,
}: LabPackageCardProps) {
  const savings = Math.round(
    (1 - labPackage.price / labPackage.originalPrice) * 100,
  );

  return (
    <article
      className={cn(
        "relative flex flex-col rounded-2xl border p-6",
        featured
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card",
      )}
    >
      <span
        className={cn(
          "w-fit rounded-full px-2 py-0.5 text-xs font-medium",
          featured ? "bg-white/15" : "bg-success-soft text-success",
        )}
      >
        Save {savings}%
      </span>
      <h3 className="mt-4 text-base font-semibold">{labPackage.name}</h3>
      <p
        className={cn(
          "mt-1 text-sm",
          featured ? "text-white/80" : "text-muted-foreground",
        )}
      >
        {labPackage.description} · {labPackage.testCount} tests
      </p>
      <ul className="mt-5 grid flex-1 gap-2 text-sm">
        {labPackage.includes.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <CheckIcon
              className={cn("size-4", featured ? "text-white" : "text-success")}
              aria-hidden
            />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-6 flex items-end justify-between gap-3">
        <div>
          <p
            className={cn(
              "text-xs line-through",
              featured ? "text-white/60" : "text-muted-foreground",
            )}
          >
            {formatFee(labPackage.originalPrice)}
          </p>
          <p className="text-lg font-semibold">{formatFee(labPackage.price)}</p>
        </div>
        <Link
          href={`/lab-tests/${labPackage.id}`}
          className={buttonVariants({
            variant: featured ? "secondary" : "default",
            className: "h-9 px-4",
          })}
        >
          Book package
        </Link>
      </div>
    </article>
  );
}
