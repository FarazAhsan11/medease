import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
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
import { VerificationStatusBadge } from "@/features/doctor-verification/components/verification-status-badge";
import type { DoctorReview } from "@/features/doctor-verification/data/doctor-reviews";
import { hasAllDocuments } from "@/features/doctor-verification/lib/verification";

export function ReviewQueueTable({ reviews }: { reviews: DoctorReview[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-5">Doctor</TableHead>
            <TableHead className="hidden md:table-cell">License</TableHead>
            <TableHead className="hidden sm:table-cell">Documents</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead className="pr-5 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reviews.map((review) => (
            <TableRow key={review.id}>
              <TableCell className="pl-5">
                <p className="font-medium">{review.name}</p>
                <p className="text-xs text-muted-foreground">
                  {review.specialization}
                </p>
                <div className="mt-1 sm:hidden">
                  <VerificationStatusBadge status={review.status} />
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {review.licenseNumber}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {hasAllDocuments(review.documents) ? (
                  <StatusBadge tone="success">Complete</StatusBadge>
                ) : (
                  <StatusBadge tone="muted">Missing</StatusBadge>
                )}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <VerificationStatusBadge status={review.status} />
              </TableCell>
              <TableCell className="pr-5 text-right">
                <Link
                  href={adminRoutes.doctor(review.id)}
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
