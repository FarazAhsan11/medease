import {
  CalendarCheckIcon,
  FileTextIcon,
  PillIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { IconTile } from "@/components/shared/icon-tile";
import { StatusBadge } from "@/components/shared/status-badge";
import { patientRoutes } from "@/config/routes";
import type { TimelineEntry as Entry } from "@/features/health-timeline/lib/health-timeline";
import { documentKindLabels } from "@/features/patient-documents/lib/document-rules";
import { formatDateKey } from "@/lib/datetime";

const MAX_MEDICINES = 3;

const linkClass =
  "text-sm font-medium text-primary underline-offset-4 hover:underline";

function listMedicines(medicines: string[]) {
  const shown = medicines.slice(0, MAX_MEDICINES).join(", ");
  const more = medicines.length - MAX_MEDICINES;
  return more > 0 ? `${shown} and ${more} more` : shown;
}

function describe(entry: Entry): {
  icon: LucideIcon;
  title: string;
  details: ReactNode;
  link: ReactNode;
} {
  switch (entry.type) {
    case "visit":
      return {
        icon: CalendarCheckIcon,
        title: `Visit with ${entry.doctorName}`,
        details: (
          <>
            <p>{entry.doctorSpecialization}</p>
            {entry.diagnosis && <p>Diagnosis: {entry.diagnosis}</p>}
            {entry.followUpOn && (
              <p>Follow-up on {formatDateKey(entry.followUpOn)}</p>
            )}
          </>
        ),
        link: (
          <Link href={patientRoutes.appointments} className={linkClass}>
            View visits
          </Link>
        ),
      };
    case "prescription":
      return {
        icon: PillIcon,
        title: `Prescription from ${entry.doctorName}`,
        details: <p>{listMedicines(entry.medicines)}</p>,
        link: (
          <Link
            href={patientRoutes.prescription(entry.id)}
            className={linkClass}
          >
            View prescription
          </Link>
        ),
      };
    case "document":
      return {
        icon: FileTextIcon,
        title: entry.title,
        details: <p>{documentKindLabels[entry.kind]}</p>,
        // A plain link: the route answers with a redirect to the file.
        link: (
          <a
            href={patientRoutes.recordDocument(entry.id)}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            Open document
          </a>
        ),
      };
  }
}

export function TimelineEntry({ entry }: { entry: Entry }) {
  const { icon, title, details, link } = describe(entry);

  return (
    <li className="flex gap-3">
      <IconTile
        icon={icon}
        size="sm"
        tone={entry.type === "document" ? "muted" : "brand"}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h4 className="text-sm font-semibold break-words">{title}</h4>
          {entry.type === "prescription" && entry.cancelled && (
            <StatusBadge tone="danger">Cancelled</StatusBadge>
          )}
        </div>
        <div className="mt-0.5 grid gap-0.5 text-sm break-words text-muted-foreground">
          <p className="text-xs">{formatDateKey(entry.dateKey)}</p>
          {details}
        </div>
        <div className="mt-1.5">{link}</div>
      </div>
    </li>
  );
}
