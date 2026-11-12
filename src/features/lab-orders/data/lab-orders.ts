import "server-only";

import { cache } from "react";

import type { BookedFor } from "@/features/family/lib/relations";
import {
  LAB_ORDER_COLUMNS,
  RECENT_ORDER_DAYS,
  toLabOrder,
  type LabOrder,
  type LabOrderRow,
} from "@/features/lab-orders/lib/lab-orders";
import { createClient } from "@/lib/supabase/server";

// Row level security limits every read to the order's patient and doctor.

// The visit an order came from, for the patient's screens.
export type LabOrderWithVisit = LabOrder & {
  visit: BookedFor & {
    doctorName: string;
    startsAt: string;
    timezone: string;
  };
};

const VISIT_COLUMNS = `${LAB_ORDER_COLUMNS}, appointments(doctor_name, starts_at, timezone, patient_name, care_recipient_name, care_recipient_relation)`;

type LabOrderVisitRow = LabOrderRow & {
  appointments: {
    doctor_name: string;
    starts_at: string;
    timezone: string;
    patient_name: string;
    care_recipient_name: string;
    care_recipient_relation: BookedFor["careRecipientRelation"];
  };
};

const toLabOrderWithVisit = (row: LabOrderVisitRow): LabOrderWithVisit => ({
  ...toLabOrder(row),
  visit: {
    doctorName: row.appointments.doctor_name,
    startsAt: row.appointments.starts_at,
    timezone: row.appointments.timezone,
    patientName: row.appointments.patient_name,
    careRecipientName: row.appointments.care_recipient_name,
    careRecipientRelation: row.appointments.care_recipient_relation,
  },
});

// Orders for these appointments, active or cancelled, by appointment id.
export async function getLabOrders(
  appointmentIds: string[],
): Promise<Record<string, LabOrder>> {
  if (appointmentIds.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lab_orders")
    .select(LAB_ORDER_COLUMNS)
    .in("appointment_id", appointmentIds)
    .returns<LabOrderRow[]>();

  if (error) throw new Error(`lab_orders: ${error.message}`);
  return Object.fromEntries(
    data.map((row) => [row.appointment_id, toLabOrder(row)]),
  );
}

export const getLabOrderForAppointment = cache(
  async (appointmentId: string): Promise<LabOrder | null> =>
    (await getLabOrders([appointmentId]))[appointmentId] ?? null,
);

export const getLabOrder = cache(
  async (orderId: string): Promise<LabOrderWithVisit | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lab_orders")
      .select(VISIT_COLUMNS)
      .eq("id", orderId)
      .maybeSingle<LabOrderVisitRow>();

    if (error) throw new Error(`lab_orders: ${error.message}`);
    return data && toLabOrderWithVisit(data);
  },
);

// The patient's active orders from the last RECENT_ORDER_DAYS, newest first.
export async function getRecentLabOrders(
  patientId: string,
): Promise<LabOrderWithVisit[]> {
  const since = new Date(Date.now() - RECENT_ORDER_DAYS * 86_400_000);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lab_orders")
    .select(VISIT_COLUMNS)
    .eq("patient_id", patientId)
    .eq("status", "active")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<LabOrderVisitRow[]>();

  if (error) throw new Error(`lab_orders: ${error.message}`);
  return data.map(toLabOrderWithVisit);
}

// A lab that does some or all of an order's tests.
export type LabOrderOffer = {
  labId: string;
  labName: string;
  labAddress: string;
  testIds: string[];
  totalPrice: number;
  turnaroundHours: number;
  homeCollection: boolean;
};

type OfferRow = {
  lab_id: string;
  lab_name: string;
  lab_address: string;
  test_type_ids: string[];
  total_price: number;
  turnaround_hours: number;
  home_collection: boolean;
};

// Labs doing the most of the order's tests first, then the cheapest.
export async function getLabOrderOffers(
  orderId: string,
): Promise<LabOrderOffer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_lab_order_offers", {
    p_order_id: orderId,
  });
  if (error) throw new Error(`get_lab_order_offers: ${error.message}`);

  return ((data ?? []) as OfferRow[]).map((row) => ({
    labId: row.lab_id,
    labName: row.lab_name,
    labAddress: row.lab_address,
    testIds: row.test_type_ids,
    totalPrice: row.total_price,
    turnaroundHours: row.turnaround_hours,
    homeCollection: row.home_collection,
  }));
}
