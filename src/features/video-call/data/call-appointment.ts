import "server-only";

import { getAppointment } from "@/features/appointments/data/appointments";

// The appointment behind a call page. Row level security returns it only to
// its own patient and doctor.
export async function getCallAppointment(appointmentId: string) {
  return getAppointment(appointmentId);
}
