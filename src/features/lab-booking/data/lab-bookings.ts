import "server-only";

import { cache } from "react";

import {
  LAB_BOOKING_COLUMNS,
  LAB_SIDE_BOOKING_COLUMNS,
  LAB_BOOKING_WITH_STEPS_COLUMNS,
  LAB_TIMEZONE,
  stageStatuses,
  toLabBooking,
  type LabBookingRow,
  type LabBookingStage,
  type LabBookingStatus,
} from "@/features/lab-booking/lib/lab-bookings";
import { toDateKey } from "@/lib/datetime";
import { createClient } from "@/lib/supabase/server";

// Row level security limits rows to the signed-in patient or lab; the filters
// keep each query on its index.

export const PATIENT_BOOKINGS_SHOWN = 50;
export const LAB_BOOKINGS_SHOWN = 100;

// The patient's bookings, newest first; with `steps`, when each step
// happened, for the tracker.
export const getPatientLabBookings = cache(
  async (userId: string, limit = PATIENT_BOOKINGS_SHOWN, steps = false) => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lab_bookings")
      .select(steps ? LAB_BOOKING_WITH_STEPS_COLUMNS : LAB_BOOKING_COLUMNS)
      .eq("patient_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<LabBookingRow[]>();

    if (error) throw new Error(`lab_bookings: ${error.message}`);
    return data.map(toLabBooking);
  },
);

// One of the patient's bookings, or null when it isn't theirs.
export async function getPatientLabBooking(userId: string, bookingId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lab_bookings")
    .select(LAB_BOOKING_COLUMNS)
    .eq("id", bookingId)
    .eq("patient_id", userId)
    .maybeSingle<LabBookingRow>();

  if (error) throw new Error(`lab_bookings: ${error.message}`);
  return data ? toLabBooking(data) : null;
}

type DayRange = { from?: string; before?: string };

// The bookings page also reads who goes to each home visit; other lists don't
// need it.
type Columns = typeof LAB_SIDE_BOOKING_COLUMNS | typeof LAB_BOOKING_COLUMNS;

// One page of a lab's bookings in some statuses, by visit day, forwards or
// backwards along the stage's index. One extra row says whether there are
// more, without counting them all.
async function readLabBookings(
  labId: string,
  statuses: LabBookingStatus[],
  ascending: boolean,
  { from, before }: DayRange,
  shown: number,
  columns: Columns = LAB_SIDE_BOOKING_COLUMNS,
) {
  const supabase = await createClient();
  let query = supabase
    .from("lab_bookings")
    .select(columns)
    .eq("lab_id", labId)
    .in("status", statuses);
  if (from) query = query.gte("visit_date", from);
  if (before) query = query.lt("visit_date", before);
  const { data, error } = await query
    .order("visit_date", { ascending })
    // A day's lab visits (no window) come before its windows.
    .order("slot_starts_at", { ascending, nullsFirst: ascending })
    .order("created_at", { ascending })
    .limit(shown + 1)
    .returns<LabBookingRow[]>();

  if (error) throw new Error(`lab_bookings: ${error.message}`);
  return {
    bookings: data.slice(0, shown).map(toLabBooking),
    more: data.length > shown,
  };
}

export const EARLIER_BOOKINGS_SHOWN = 50;

// The lab's bookings at one stage. To collect: today and later, soonest
// first, plus bookings still open from earlier days, latest first, kept apart
// so a pile of old ones can't push today's off the page. In the lab: oldest
// first, as samples are worked in order. Finished: latest first.
export async function getLabBookings(labId: string, stage: LabBookingStage) {
  if (stage === "to-collect") {
    const today = toDateKey(new Date(), LAB_TIMEZONE);
    const [current, earlier] = await Promise.all([
      readLabBookings(
        labId,
        stageStatuses[stage],
        true,
        { from: today },
        LAB_BOOKINGS_SHOWN,
      ),
      readLabBookings(
        labId,
        stageStatuses[stage],
        false,
        { before: today },
        EARLIER_BOOKINGS_SHOWN,
      ),
    ]);
    return { ...current, earlier };
  }
  const list = await readLabBookings(
    labId,
    stageStatuses[stage],
    stage === "in-lab",
    {},
    LAB_BOOKINGS_SHOWN,
  );
  return { ...list, earlier: null };
}

// Bookings waiting for their report, the longest-waiting visit first.
export function getLabBookingsAwaitingReport(labId: string) {
  return readLabBookings(
    labId,
    ["processing"],
    true,
    {},
    LAB_BOOKINGS_SHOWN,
    LAB_BOOKING_COLUMNS,
  );
}

// How many bookings wait at each open stage, for the tabs.
export async function getOpenLabBookingCounts(labId: string) {
  const supabase = await createClient();
  const count = async (stage: LabBookingStage) => {
    const { count, error } = await supabase
      .from("lab_bookings")
      .select("id", { count: "exact", head: true })
      .eq("lab_id", labId)
      .in("status", stageStatuses[stage]);
    if (error) throw new Error(`lab_bookings: ${error.message}`);
    return count ?? 0;
  };
  const [toCollect, inLab] = await Promise.all([
    count("to-collect"),
    count("in-lab"),
  ]);
  return { "to-collect": toCollect, "in-lab": inLab } satisfies Partial<
    Record<LabBookingStage, number>
  >;
}
