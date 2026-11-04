import "server-only";

import { listPatientAppointments } from "@/features/appointments/data/appointments";
import {
  buildTimeline,
  isPastVisit,
} from "@/features/health-timeline/lib/health-timeline";
import type { PatientDocument } from "@/features/patient-documents/lib/patient-documents";
import { listPatientPrescriptions } from "@/features/prescriptions/data/prescriptions";
import { getVisitSummaries } from "@/features/visit-summaries/data/visit-summaries";

// Every loader reads through row level security, so a patient sees only their
// own records. The records page loads the documents too, so it passes in that
// request rather than starting a second one.
export async function getHealthTimeline(
  patientId: string,
  documentsLoading: Promise<PatientDocument[]>,
) {
  const now = Date.now();
  const [appointments, prescriptions, documents] = await Promise.all([
    listPatientAppointments(patientId),
    listPatientPrescriptions(patientId),
    documentsLoading,
  ]);
  const summaries = await getVisitSummaries(
    appointments
      .filter((appointment) => isPastVisit(appointment, now))
      .map((appointment) => appointment.id),
  );

  return buildTimeline(
    { appointments, summaries, prescriptions, documents },
    now,
  );
}
