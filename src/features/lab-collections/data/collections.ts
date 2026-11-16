import "server-only";

import { z } from "zod";

import {
  LAB_BOOKING_COLUMNS,
  OPEN_SAMPLE_COLUMNS,
  toLabBooking,
  type LabBookingRow,
} from "@/features/lab-booking/lib/lab-bookings";
import {
  cashSummaryRowSchema,
  containersFor,
  type CollectionVisit,
} from "@/features/lab-collections/lib/collections";
import { createClient } from "@/lib/supabase/server";

// The lab list's columns, but only the visits given to this person: the
// inner join drops the rest, which an admin or front desk would otherwise see
// too. The kit is what each item needs, for the containers to bring.
const COLLECTION_COLUMNS = `${LAB_BOOKING_COLUMNS},
  assignment:lab_booking_assignments!inner (collector_id),
  ${OPEN_SAMPLE_COLUMNS},
  kit:lab_booking_items (sample_types)`;

type CollectionRow = LabBookingRow & {
  kit: { sample_types: string[] | null }[];
};

export const EARLIER_VISITS_SHOWN = 20;

function toVisit(row: CollectionRow): CollectionVisit {
  return {
    booking: toLabBooking(row),
    sampleTypes: containersFor(row.kit.map((item) => item.sample_types)),
  };
}

// The query builder is a thenable, so it's returned only once the client is
// in hand, never through a promise (which would run it).
function visitsQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  labId: string,
  collectorId: string,
) {
  return supabase
    .from("lab_bookings")
    .select(COLLECTION_COLUMNS)
    .eq("lab_id", labId)
    .eq("collection", "home")
    .eq("assignment.collector_id", collectorId)
    .is("samples.rejected_at", null);
}

// The person's home visits on one day, by window, then area. Along the
// lab's (lab, day) index; a day's visits for one lab are few.
export async function getCollectionVisits(
  labId: string,
  collectorId: string,
  day: string,
) {
  const supabase = await createClient();
  const { data, error } = await visitsQuery(supabase, labId, collectorId)
    .eq("visit_date", day)
    .order("slot_starts_at")
    .order("area")
    .order("created_at")
    .limit(200)
    .returns<CollectionRow[]>();
  if (error) throw new Error(`lab_bookings: ${error.message}`);
  return data.map(toVisit);
}

// Their visits from earlier days still to collect, latest first.
export async function getEarlierOpenVisits(
  labId: string,
  collectorId: string,
  before: string,
) {
  const supabase = await createClient();
  const { data, error } = await visitsQuery(supabase, labId, collectorId)
    .lt("visit_date", before)
    .in("status", ["booked", "recollection_needed"])
    .order("visit_date", { ascending: false })
    .order("slot_starts_at", { ascending: false })
    .limit(EARLIER_VISITS_SHOWN + 1)
    .returns<CollectionRow[]>();
  if (error) throw new Error(`lab_bookings: ${error.message}`);
  return {
    visits: data.slice(0, EARLIER_VISITS_SHOWN).map(toVisit),
    more: data.length > EARLIER_VISITS_SHOWN,
  };
}

// Per person: visits that day, collected, cash taken. The database gives a
// collector their own line and those who see every booking everyone's.
export async function getCashSummary(day: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_lab_cash_summary", {
    p_day: day,
  });
  if (error) throw new Error(`get_lab_cash_summary: ${error.message}`);
  return z.array(cashSummaryRowSchema).parse(data);
}
