import "server-only";

import { z } from "zod";

import { APPOINTMENT_COLUMNS } from "@/features/appointments/data/appointments";
import {
  toAppointment,
  type AppointmentRow,
} from "@/features/appointments/lib/appointments";
import { createClient } from "@/lib/supabase/server";

// The appointment behind a call page. Row level security returns it only to
// its own patient and doctor.
export async function getCallAppointment(appointmentId: string) {
  if (!z.uuid().safeParse(appointmentId).success) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_COLUMNS)
    .eq("id", appointmentId)
    .maybeSingle<AppointmentRow>();

  if (error) throw new Error(`appointments: ${error.message}`);
  return data ? toAppointment(data) : null;
}
