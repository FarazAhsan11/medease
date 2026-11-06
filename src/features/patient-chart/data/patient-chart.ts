import "server-only";

import { z } from "zod";

import {
  getAppointmentNotes,
  listDoctorPatientAppointments,
} from "@/features/appointments/data/appointments";
import {
  hasTakenPlace,
  isUpcoming,
} from "@/features/appointments/lib/appointments";
import { countPreviousVisits } from "@/features/doctor-dashboard/lib/practice";
import { getMedicalProfiles } from "@/features/medical-profile/data/medical-profiles";
import { getDoctorPrescriptionSummaries } from "@/features/prescriptions/data/prescriptions";
import { getVisitSummaries } from "@/features/visit-summaries/data/visit-summaries";

// What one doctor has for one patient: their visits together, with the notes,
// summaries and prescriptions the doctor wrote. Every read goes through row
// level security, so another doctor's records never appear. Only for a patient
// the doctor has seen: an upcoming booking alone opens nothing.
// Documents the patient uploads join once they can share them (REC-03).
export async function getPatientChart(doctorId: string, patientId: string) {
  if (!z.uuid().safeParse(patientId).success) return null;

  const [appointments, prescriptions] = await Promise.all([
    listDoctorPatientAppointments(doctorId, patientId),
    getDoctorPrescriptionSummaries(doctorId, { patientId }),
  ]);
  const now = Date.now();
  // Appointments come newest first.
  const seen = appointments.filter((item) => hasTakenPlace(item, now));
  if (seen.length === 0) return null;

  const ids = appointments.map((appointment) => appointment.id);
  const [notes, summaries, profiles] = await Promise.all([
    getAppointmentNotes(ids),
    getVisitSummaries(ids),
    getMedicalProfiles(appointments.map((item) => item.careRecipientId)),
  ]);

  // The newest booking has the freshest contact details.
  const [latest] = appointments;
  // The account holder's own profile heads the chart. Family members' profiles
  // show on their visits (PRO-03).
  const ownProfile =
    Object.values(profiles).find((profile) => profile.relation === "self") ??
    null;
  return {
    patient: {
      name: latest.patientName,
      email: latest.patientEmail,
      phone:
        appointments.find((item) => item.patientPhone)?.patientPhone ?? null,
    },
    firstVisit: seen.at(-1)!,
    nextVisit: appointments.findLast((item) => isUpcoming(item, now)) ?? null,
    completedVisits: appointments.filter((item) => item.status === "completed")
      .length,
    appointments,
    notes,
    prescriptions,
    summaries,
    profiles,
    ownProfile,
    previousVisits: countPreviousVisits(appointments),
  };
}

export type PatientChart = NonNullable<
  Awaited<ReturnType<typeof getPatientChart>>
>;
