import "server-only";

import { cache } from "react";

import type { BookedFor } from "@/features/family/lib/relations";
import {
  LAB_ORDER_COLUMNS,
  RECENT_ORDER_DAYS,
  remainingTests,
  toLabOrder,
  type LabOrder,
  type LabOrderRow,
  type OrderBooking,
  type OrderResult,
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
// About 37 characters per uuid in the query string keeps a batch near 4 KB.
const IDS_PER_REQUEST = 100;

export async function getLabOrders(
  appointmentIds: string[],
): Promise<Record<string, LabOrder>> {
  if (appointmentIds.length === 0) return {};

  const supabase = await createClient();
  // Ids go in the URL, so long lists are read in batches at once.
  const batches = [];
  for (let i = 0; i < appointmentIds.length; i += IDS_PER_REQUEST) {
    batches.push(appointmentIds.slice(i, i + IDS_PER_REQUEST));
  }
  const results = await Promise.all(
    batches.map((ids) =>
      supabase
        .from("lab_orders")
        .select(LAB_ORDER_COLUMNS)
        .in("appointment_id", ids)
        .returns<LabOrderRow[]>(),
    ),
  );

  const orders: Record<string, LabOrder> = {};
  for (const { data, error } of results) {
    if (error) throw new Error(`lab_orders: ${error.message}`);
    for (const row of data) orders[row.appointment_id] = toLabOrder(row);
  }
  return orders;
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

// The patient's bookings made from these orders, except cancelled ones, oldest
// first. A patient has at most a handful of orders on a page, so one request.
export async function getOrderBookings(
  orderIds: string[],
): Promise<OrderBooking[]> {
  if (orderIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lab_bookings")
    .select("id, lab_order_id, lab_name, status, ordered_test_ids")
    .in("lab_order_id", orderIds)
    .neq("status", "cancelled")
    .order("created_at")
    .returns<
      {
        id: string;
        lab_order_id: string;
        lab_name: string;
        status: OrderBooking["status"];
        ordered_test_ids: string[];
      }[]
    >();

  if (error) throw new Error(`lab_bookings: ${error.message}`);
  return data.map((row) => ({
    id: row.id,
    orderId: row.lab_order_id,
    labName: row.lab_name,
    status: row.status,
    testIds: row.ordered_test_ids,
  }));
}

type OrderResultRow = {
  booking_id: string;
  lab_name: string;
  status: OrderResult["status"];
  collection: OrderResult["collection"];
  visit_date: string;
  slot_starts_at: string | null;
  timezone: string;
  ordered_test_ids: string[];
  report_id: string | null;
  report_published_at: string | null;
  comment: string | null;
  reviewed_at: string | null;
};

// The doctor's view of the bookings and results for a visit's order. The
// doctor can't read bookings, so a database function returns only what they
// need.
export async function getOrderResults(
  appointmentId: string,
): Promise<OrderResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_lab_order_bookings", {
    p_appointment_id: appointmentId,
  });
  if (error) throw new Error(`get_lab_order_bookings: ${error.message}`);

  return ((data ?? []) as OrderResultRow[]).map((row) => ({
    bookingId: row.booking_id,
    labName: row.lab_name,
    status: row.status,
    collection: row.collection,
    visitDate: row.visit_date,
    slotStartsAt: row.slot_starts_at,
    timezone: row.timezone,
    testIds: row.ordered_test_ids,
    reportId: row.report_id,
    reportPublishedAt: row.report_published_at,
    comment: row.comment,
    reviewedAt: row.reviewed_at,
  }));
}

// The patient's active orders from the last RECENT_ORDER_DAYS that still have
// tests to book, newest first.
export async function getRecentLabOrders(
  patientId: string,
): Promise<LabOrderWithVisit[]> {
  const since = new Date(Date.now() - RECENT_ORDER_DAYS * 86_400_000);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lab_orders")
    .select(`${VISIT_COLUMNS}, lab_bookings(ordered_test_ids, status)`)
    .eq("patient_id", patientId)
    .eq("status", "active")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<
      (LabOrderVisitRow & {
        lab_bookings: {
          ordered_test_ids: string[];
          status: OrderBooking["status"];
        }[];
      })[]
    >();

  if (error) throw new Error(`lab_orders: ${error.message}`);
  return data
    .filter((row) => {
      const live = row.lab_bookings
        .filter((booking) => booking.status !== "cancelled")
        .map((booking) => ({ testIds: booking.ordered_test_ids }));
      return remainingTests(toLabOrder(row), live).length > 0;
    })
    .map(toLabOrderWithVisit);
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
