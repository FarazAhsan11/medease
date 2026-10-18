import "server-only";

import {
  toAppointment,
  type AppointmentRow,
} from "@/features/appointments/lib/appointments";
import { createClient } from "@/lib/supabase/server";

export const APPOINTMENT_COLUMNS =
  "id, doctor_id, patient_id, starts_at, ends_at, status, reason, doctor_name, doctor_specialization, consultation_fee, timezone, patient_name, patient_email, patient_phone, cancelled_by, cancellation_reason, created_at";

// Row level security already limits rows to the signed-in user; the explicit
// filters keep queries on the right index.

export async function listPatientAppointments(patientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_COLUMNS)
    .eq("patient_id", patientId)
    .order("starts_at", { ascending: false })
    .limit(200)
    .returns<AppointmentRow[]>();

  if (error) throw new Error(`appointments: ${error.message}`);
  return data.map(toAppointment);
}

export async function listDoctorAppointments(
  doctorId: string,
  { since }: { since?: Date } = {},
) {
  const supabase = await createClient();
  let query = supabase
    .from("appointments")
    .select(APPOINTMENT_COLUMNS)
    .eq("doctor_id", doctorId);
  if (since) query = query.gte("starts_at", since.toISOString());

  const { data, error } = await query
    .order("starts_at", { ascending: true })
    .limit(1000)
    .returns<AppointmentRow[]>();

  if (error) throw new Error(`appointments: ${error.message}`);
  return data.map(toAppointment);
}

// Private notes for a doctor's appointments, keyed by appointment id.
export async function getAppointmentNotes(appointmentIds: string[]) {
  if (appointmentIds.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointment_notes")
    .select("appointment_id, notes")
    .in("appointment_id", appointmentIds)
    .returns<{ appointment_id: string; notes: string }[]>();

  if (error) throw new Error(`appointment_notes: ${error.message}`);
  return Object.fromEntries(data.map((row) => [row.appointment_id, row.notes]));
}
