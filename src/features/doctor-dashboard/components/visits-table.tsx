import { MonitorIcon, StethoscopeIcon } from "lucide-react";
import Link from "next/link";

import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { doctorRoutes } from "@/config/routes";
import type {
  ScheduledVisit,
  ScheduleStatus,
} from "@/features/doctor-dashboard/data/schedule";

const statusTones: Record<ScheduleStatus, StatusTone> = {
  Upcoming: "info",
  Completed: "success",
  Cancelled: "danger",
};

type VisitsTableProps = {
  visits: ScheduledVisit[];
};

export function VisitsTable({ visits }: VisitsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-5">Patient</TableHead>
            <TableHead>Date & time</TableHead>
            <TableHead className="hidden md:table-cell">Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="pr-5 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visits.map((visit) => {
            const TypeIcon =
              visit.type === "Video" ? MonitorIcon : StethoscopeIcon;

            return (
              <TableRow key={visit.id}>
                <TableCell className="pl-5">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={visit.patientName} className="size-8" />
                    <div>
                      <p className="font-medium">{visit.patientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {visit.reason}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-medium">{visit.time}</p>
                  <p className="text-xs text-muted-foreground">{visit.date}</p>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <TypeIcon className="size-3.5" aria-hidden />
                    {visit.type}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge tone={statusTones[visit.status]}>
                    {visit.status}
                  </StatusBadge>
                </TableCell>
                <TableCell className="pr-5 text-right">
                  {visit.status === "Upcoming" && visit.type === "Video" ? (
                    <Link
                      href={doctorRoutes.consultation}
                      className={buttonVariants({ size: "sm" })}
                    >
                      Start call
                    </Link>
                  ) : (
                    <Button size="sm" variant="ghost">
                      View
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
