import "server-only";

import {
  itemKey,
  LAB_TIMEZONE,
  VISIT_WINDOW_DAYS,
  type BookableItem,
  type CollectionArea,
} from "@/features/lab-booking/lib/lab-bookings";
import { addDaysToDateKey, dateChipParts, toDateKey } from "@/lib/datetime";
import {
  groupSlotsByDay,
  type BookingDay,
  type DateOption,
} from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";

// Everything the booking page offers for one lab, read through the public
// views, which show only listed items from verified labs.

export type BookingLab = {
  id: string;
  name: string;
  address: string;
  phone: string;
};

export type LabBookingOptions = {
  lab: BookingLab;
  items: BookableItem[];
  // Cities the lab collects in; empty when home collection is off.
  areas: CollectionArea[];
  freeAbove: number | null;
  // Collection windows grouped by day, full ones marked.
  collectionDays: BookingDay[];
  // Days a lab visit can be booked for.
  visitDays: DateOption[];
};

type TestRow = {
  id: string;
  test_type_id: string;
  test_name: string;
  price: number;
  turnaround_hours: number;
  home_collection: boolean;
};

type PackageRow = {
  id: string;
  name: string;
  price: number;
  turnaround_hours: number;
  home_collection: boolean;
  test_names: string[];
};

type AreaRow = {
  city: string;
  fee: number;
  note: string | null;
  free_above: number | null;
};

type SlotRow = { starts_at: string; ends_at: string; spots_left: number };

// One round trip for the whole window, grouped by the lab's calendar day.
function toCollectionDays(rows: SlotRow[]): BookingDay[] {
  return groupSlotsByDay(
    rows.map((slot) => ({
      startsAt: slot.starts_at,
      taken: slot.spots_left < 1,
      note:
        slot.spots_left < 1
          ? "Full"
          : slot.spots_left === 1
            ? "1 left"
            : undefined,
    })),
    LAB_TIMEZONE,
  );
}

// Days a lab visit can be booked for: today and the next 13.
export function getVisitDays(): DateOption[] {
  const today = toDateKey(new Date(), LAB_TIMEZONE);
  return Array.from({ length: VISIT_WINDOW_DAYS }, (_, index) => {
    const key = addDaysToDateKey(today, index);
    return {
      value: key,
      ...dateChipParts(key, LAB_TIMEZONE),
      note: index === 0 ? "Today" : undefined,
    };
  });
}

// The lab's collection windows for the next two weeks, full ones marked.
// Empty when the lab isn't collecting.
export async function getCollectionDays(labId: string): Promise<BookingDay[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_lab_collection_slots", {
    p_lab_id: labId,
    p_days: VISIT_WINDOW_DAYS,
  });
  if (error) throw new Error(`get_lab_collection_slots: ${error.message}`);
  return toCollectionDays((data ?? []) as SlotRow[]);
}

export async function getLabBookingOptions(
  labId: string,
): Promise<LabBookingOptions | null> {
  const supabase = await createClient();
  const [lab, tests, packages, areas] = await Promise.all([
    supabase
      .from("lab_directory")
      .select("id, lab_name, address, phone")
      .eq("id", labId)
      .maybeSingle<{
        id: string;
        lab_name: string;
        address: string;
        phone: string;
      }>(),
    supabase
      .from("lab_test_offers")
      .select(
        "id, test_type_id, test_name, price, turnaround_hours, home_collection",
      )
      .eq("lab_id", labId)
      .order("test_name")
      .returns<TestRow[]>(),
    supabase
      .from("lab_package_offers")
      .select("id, name, price, turnaround_hours, home_collection, test_names")
      .eq("lab_id", labId)
      .order("price")
      .returns<PackageRow[]>(),
    supabase
      .from("lab_collection_areas")
      .select("city, fee, note, free_above")
      .eq("lab_id", labId)
      .order("city")
      .returns<AreaRow[]>(),
  ]);

  if (lab.error) throw new Error(`lab_directory: ${lab.error.message}`);
  if (tests.error) throw new Error(`lab_test_offers: ${tests.error.message}`);
  if (packages.error) {
    throw new Error(`lab_package_offers: ${packages.error.message}`);
  }
  if (areas.error) {
    throw new Error(`lab_collection_areas: ${areas.error.message}`);
  }
  if (!lab.data) return null;

  const collectionDays =
    areas.data.length > 0 ? await getCollectionDays(labId) : [];

  return {
    lab: {
      id: lab.data.id,
      name: lab.data.lab_name,
      address: lab.data.address,
      phone: lab.data.phone,
    },
    items: [
      ...packages.data.map((row): BookableItem => ({
        key: itemKey("package", row.id),
        id: row.id,
        kind: "package",
        name: row.name,
        price: row.price,
        turnaroundHours: row.turnaround_hours,
        homeCollection: row.home_collection,
        testNames: row.test_names,
      })),
      ...tests.data.map((row): BookableItem => ({
        key: itemKey("test", row.id),
        id: row.id,
        kind: "test",
        name: row.test_name,
        price: row.price,
        turnaroundHours: row.turnaround_hours,
        homeCollection: row.home_collection,
        testNames: [row.test_name],
        testTypeId: row.test_type_id,
      })),
    ],
    areas: areas.data.map(({ city, fee, note }) => ({ city, fee, note })),
    freeAbove: areas.data[0]?.free_above ?? null,
    collectionDays,
    visitDays: getVisitDays(),
  };
}
