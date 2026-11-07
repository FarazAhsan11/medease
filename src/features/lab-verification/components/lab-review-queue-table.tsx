import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { VerificationStatusBadge } from "@/components/shared/verification-status-badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminRoutes } from "@/config/routes";
import type { LabReview } from "@/features/lab-verification/data/lab-reviews";
import { licensingAuthorities } from "@/features/lab-verification/lib/lab-verification";

export function LabReviewQueueTable({ reviews }: { reviews: LabReview[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-5">Lab</TableHead>
            <TableHead className="hidden md:table-cell">Licensed by</TableHead>
            <TableHead className="hidden sm:table-cell">Licence</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead className="pr-5 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reviews.map((review) => (
            <TableRow key={review.id}>
              <TableCell className="max-w-48 pl-5 whitespace-normal">
                <p className="font-medium break-words">{review.name}</p>
                <p className="text-xs text-muted-foreground">
                  {review.registrationNumber}
                </p>
                <div className="mt-1 sm:hidden">
                  <VerificationStatusBadge status={review.status} />
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {review.licensingAuthority
                  ? licensingAuthorities[review.licensingAuthority]
                  : "Not set"}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {review.licensePath ? (
                  <StatusBadge tone="success">Sent</StatusBadge>
                ) : (
                  <StatusBadge tone="muted">Missing</StatusBadge>
                )}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <VerificationStatusBadge status={review.status} />
              </TableCell>
              <TableCell className="pr-5 text-right">
                <Link
                  href={adminRoutes.lab(review.id)}
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className: "h-8 px-3",
                  })}
                >
                  Open
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
