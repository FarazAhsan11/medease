import "server-only";

import { listPatientAppointments } from "@/features/appointments/data/appointments";
import { hasTakenPlace } from "@/features/appointments/lib/appointments";
import { buildTimeline } from "@/features/health-timeline/lib/health-timeline";
import { listPatientLabReports } from "@/features/lab-reports/data/lab-reports";
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
  const [appointments, prescriptions, documents, labReports] =
    await Promise.all([
      listPatientAppointments(patientId),
      listPatientPrescriptions(patientId),
      documentsLoading,
      listPatientLabReports(patientId),
    ]);
  const summaries = await getVisitSummaries(
    appointments
      .filter((appointment) => hasTakenPlace(appointment, now))
      .map((appointment) => appointment.id),
  );

  return buildTimeline(
    { appointments, summaries, prescriptions, documents, labReports },
    now,
  );
}
