import "server-only";

import { z } from "zod";

import {
  toPrescription,
  type PrescriptionRow,
  type PrescriptionSummary,
} from "@/features/prescriptions/lib/prescriptions";
import { createClient } from "@/lib/supabase/server";

const PRESCRIPTION_COLUMNS =
  "id, appointment_id, doctor_id, patient_id, status, diagnosis, advice, doctor_name, doctor_specialization, doctor_license, clinic_address, patient_name, timezone, replaces_id, issued_at, cancelled_at, cancellation_reason, prescription_items(id, sort_order, medicine, strength, form, dose, frequency, dose_times, meal, duration_days, instructions)";

// Row level security already limits rows to the prescription's own patient
// and doctor; the explicit filters keep queries on the right index.
// Replaced versions are history only, so lists leave them out.

export async function listPatientPrescriptions(patientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prescriptions")
    .select(PRESCRIPTION_COLUMNS)
    .eq("patient_id", patientId)
    .neq("status", "replaced")
    .order("issued_at", { ascending: false })
    .limit(200)
    .returns<PrescriptionRow[]>();

  if (error) throw new Error(`prescriptions: ${error.message}`);
  return data.map(toPrescription);
}

// The active prescription and any cancelled ones for one appointment,
// newest first.
export async function listAppointmentPrescriptions(appointmentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prescriptions")
    .select(PRESCRIPTION_COLUMNS)
    .eq("appointment_id", appointmentId)
    .neq("status", "replaced")
    .order("issued_at", { ascending: false })
    .returns<PrescriptionRow[]>();

  if (error) throw new Error(`prescriptions: ${error.message}`);
  return data.map(toPrescription);
}

export async function getPrescription(prescriptionId: string) {
  if (!z.uuid().safeParse(prescriptionId).success) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prescriptions")
    .select(PRESCRIPTION_COLUMNS)
    .eq("id", prescriptionId)
    .maybeSingle<PrescriptionRow>();

  if (error) throw new Error(`prescriptions: ${error.message}`);
  return data ? toPrescription(data) : null;
}

// The version that replaced this one, for old links to an edited prescription.
export async function getReplacementId(prescriptionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prescriptions")
    .select("id")
    .eq("replaces_id", prescriptionId)
    .maybeSingle<{ id: string }>();

  if (error) throw new Error(`prescriptions: ${error.message}`);
  return data?.id ?? null;
}

type SummaryRow = {
  id: string;
  appointment_id: string;
  status: PrescriptionSummary["status"];
  issued_at: string;
  prescription_items: { medicine: string; sort_order: number }[];
};

// For a doctor's appointment lists, keyed by appointment id: the active
// prescription, or else the latest cancelled one.
export async function getDoctorPrescriptionSummaries(doctorId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prescriptions")
    .select(
      "id, appointment_id, status, issued_at, prescription_items(medicine, sort_order)",
    )
    .eq("doctor_id", doctorId)
    .neq("status", "replaced")
    .order("issued_at", { ascending: false })
    .limit(1000)
    .returns<SummaryRow[]>();

  if (error) throw new Error(`prescriptions: ${error.message}`);

  const summaries: Record<string, PrescriptionSummary> = {};
  for (const row of data) {
    const existing = summaries[row.appointment_id];
    if (existing && (existing.status === "active" || row.status !== "active")) {
      continue;
    }
    summaries[row.appointment_id] = {
      id: row.id,
      status: row.status,
      medicines: [...row.prescription_items]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => item.medicine),
    };
  }
  return summaries;
}
