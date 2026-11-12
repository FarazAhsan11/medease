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
import { doctorRoutes } from "@/config/routes";
import {
  isActive,
  type Appointment,
} from "@/features/appointments/lib/appointments";
import { JoinCallButton } from "@/features/video-call/components/join-call-button";
import { AppointmentDetailsSheet } from "@/features/doctor-dashboard/components/appointment-details-sheet";
import type { MedicalProfile } from "@/features/medical-profile/lib/medical-profile";
import type { LabOrder } from "@/features/lab-orders/lib/lab-orders";
import type { PrescriptionSummary } from "@/features/prescriptions/lib/prescriptions";
import type { VisitSummary } from "@/features/visit-summaries/lib/visit-summaries";
import { formatDate, formatTime } from "@/lib/datetime";

type VisitsTableProps = {
  visits: Appointment[];
  notes: Record<string, string>;
  previousVisits: Record<string, number>;
  prescriptions: Record<string, PrescriptionSummary>;
  summaries: Record<string, VisitSummary>;
  labOrders: Record<string, LabOrder>;
  // By care recipient id.
  profiles: Record<string, MedicalProfile>;
};

export function VisitsTable({
  visits,
  notes,
  previousVisits,
  prescriptions,
  summaries,
  labOrders,
  profiles,
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
                  <UserAvatar
                    name={visit.careRecipientName}
                    className="size-8"
                  />
                  <div className="min-w-0">
                    <p className="font-medium">{visit.careRecipientName}</p>
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
                <div className="flex justify-end gap-2">
                  {isActive(visit) && (
                    <JoinCallButton
                      startsAt={visit.startsAt}
                      endsAt={visit.endsAt}
                      href={doctorRoutes.consultation(visit.id)}
                    />
                  )}
                  <AppointmentDetailsSheet
                    appointment={visit}
                    notes={notes[visit.id] ?? ""}
                    previousVisits={previousVisits[visit.id] ?? 0}
                    prescription={prescriptions[visit.id] ?? null}
                    summary={summaries[visit.id] ?? null}
                    labOrder={labOrders[visit.id] ?? null}
                    profile={profiles[visit.careRecipientId] ?? null}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
