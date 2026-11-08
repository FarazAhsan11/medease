import "server-only";

import { cache } from "react";

import {
  LAB_BOOKING_COLUMNS,
  LAB_TIMEZONE,
  toLabBooking,
  type LabBookingRow,
} from "@/features/lab-booking/lib/lab-bookings";
import { toDateKey } from "@/lib/datetime";
import { createClient } from "@/lib/supabase/server";

// Row level security limits rows to the signed-in patient or lab; the filters
// keep each query on its index.

export const PATIENT_BOOKINGS_SHOWN = 50;
export const LAB_BOOKINGS_SHOWN = 100;

// The patient's bookings, newest first.
export const getPatientLabBookings = cache(
  async (userId: string, limit = PATIENT_BOOKINGS_SHOWN) => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lab_bookings")
      .select(LAB_BOOKING_COLUMNS)
      .eq("patient_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<LabBookingRow[]>();

    if (error) throw new Error(`lab_bookings: ${error.message}`);
    return data.map(toLabBooking);
  },
);

export type LabBookingsView = "upcoming" | "past";

// The lab's bookings: from today on, soonest first, or earlier ones, latest
// first.
export async function getLabBookings(labId: string, view: LabBookingsView) {
  const today = toDateKey(new Date(), LAB_TIMEZONE);
  const upcoming = view === "upcoming";
  const supabase = await createClient();
  let query = supabase
    .from("lab_bookings")
    .select(LAB_BOOKING_COLUMNS)
    .eq("lab_id", labId);
  query = upcoming
    ? query.gte("visit_date", today)
    : query.lt("visit_date", today);
  const { data, error } = await query
    .order("visit_date", { ascending: upcoming })
    .order("slot_starts_at", { ascending: upcoming, nullsFirst: upcoming })
    .order("created_at", { ascending: upcoming })
    // One extra row says whether there are more, without counting them all.
    .limit(LAB_BOOKINGS_SHOWN + 1)
    .returns<LabBookingRow[]>();

  if (error) throw new Error(`lab_bookings: ${error.message}`);
  return {
    bookings: data.slice(0, LAB_BOOKINGS_SHOWN).map(toLabBooking),
    more: data.length > LAB_BOOKINGS_SHOWN,
  };
}
