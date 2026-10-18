import { UserAvatar } from "@/components/shared/user-avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AppointmentStatusBadge } from "@/features/appointments/components/appointment-status-badge";
import type { Appointment } from "@/features/appointments/lib/appointments";
import { AppointmentDetailsSheet } from "@/features/doctor-dashboard/components/appointment-details-sheet";
import { formatDate, formatTime } from "@/lib/datetime";

type VisitsTableProps = {
  visits: Appointment[];
  notes: Record<string, string>;
  previousVisits: Record<string, number>;
};

export function VisitsTable({
  visits,
  notes,
  previousVisits,
}: VisitsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-5">Patient</TableHead>
            <TableHead>Date & time</TableHead>
            <TableHead className="hidden md:table-cell">Status</TableHead>
            <TableHead className="pr-5 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visits.map((visit) => (
            <TableRow key={visit.id}>
              <TableCell className="pl-5">
                <div className="flex items-center gap-3">
                  <UserAvatar name={visit.patientName} className="size-8" />
                  <div className="min-w-0">
                    <p className="font-medium">{visit.patientName}</p>
                    <p className="max-w-56 truncate text-xs text-muted-foreground">
                      {visit.reason ?? "No reason given"}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <p className="font-medium">
                  {formatTime(visit.startsAt, visit.timezone)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(visit.startsAt, visit.timezone)}
                </p>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <AppointmentStatusBadge appointment={visit} viewer="doctor" />
              </TableCell>
              <TableCell className="pr-5 text-right">
                <AppointmentDetailsSheet
                  appointment={visit}
                  notes={notes[visit.id] ?? ""}
                  previousVisits={previousVisits[visit.id] ?? 0}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
