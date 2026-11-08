import "server-only";

import {
  DEFAULT_COLLECTION_SETTINGS,
  type HomeCollectionSetup,
  type LabCollectionAreas,
} from "@/features/home-collection/lib/home-collection";
import { createClient } from "@/lib/supabase/server";

type SettingsRow = {
  accepting: boolean;
  slot_minutes: number;
  capacity: number;
  notice_hours: number;
  free_above: number | null;
};

type HoursRow = { weekday: number; start_time: string; end_time: string };

type AreaRow = { id: string; city: string; fee: number; note: string | null };

// "07:00:00" → "07:00"
const toTime = (value: string) => value.slice(0, 5);

// One lab's home collection setup. RLS limits it to the signed-in lab; the
// filters keep each query on the lab's key.
export async function getHomeCollectionSetup(
  labId: string,
): Promise<HomeCollectionSetup> {
  const supabase = await createClient();
  const [settings, hours, areas] = await Promise.all([
    supabase
      .from("lab_collection_settings")
      .select("accepting, slot_minutes, capacity, notice_hours, free_above")
      .eq("lab_id", labId)
      .maybeSingle<SettingsRow>(),
    supabase
      .from("lab_collection_hours")
      .select("weekday, start_time, end_time")
      .eq("lab_id", labId)
      .order("weekday")
      .order("start_time")
      .returns<HoursRow[]>(),
    supabase
      .from("lab_service_areas")
      .select("id, city, fee, note")
      .eq("lab_id", labId)
      .order("city")
      .returns<AreaRow[]>(),
  ]);

  if (settings.error) {
    throw new Error(`lab_collection_settings: ${settings.error.message}`);
  }
  if (hours.error) {
    throw new Error(`lab_collection_hours: ${hours.error.message}`);
  }
  if (areas.error) throw new Error(`lab_service_areas: ${areas.error.message}`);

  return {
    settings: settings.data
      ? {
          accepting: settings.data.accepting,
          slotMinutes: settings.data.slot_minutes,
          capacity: settings.data.capacity,
          noticeHours: settings.data.notice_hours,
          freeAbove: settings.data.free_above,
        }
      : DEFAULT_COLLECTION_SETTINGS,
    hours: hours.data.map((row) => ({
      weekday: row.weekday,
      start: toTime(row.start_time),
      end: toTime(row.end_time),
    })),
    areas: areas.data,
  };
}

type CollectionAreaRow = {
  lab_id: string;
  city: string;
  fee: number;
  free_above: number | null;
};

// Where each of these labs collects at home, for patients comparing them.
// Only labs that are listed with home collection on appear.
export async function getCollectionAreas(
  labIds: string[],
): Promise<Map<string, LabCollectionAreas>> {
  const areas = new Map<string, LabCollectionAreas>();
  if (labIds.length === 0) return areas;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lab_collection_areas")
    .select("lab_id, city, fee, free_above")
    .in("lab_id", labIds)
    .order("city")
    .returns<CollectionAreaRow[]>();
  if (error) throw new Error(`lab_collection_areas: ${error.message}`);

  for (const row of data) {
    const lab = areas.get(row.lab_id);
    if (lab) {
      lab.cities.push(row.city);
      lab.lowestFee = Math.min(lab.lowestFee, row.fee);
      lab.highestFee = Math.max(lab.highestFee, row.fee);
    } else {
      areas.set(row.lab_id, {
        cities: [row.city],
        lowestFee: row.fee,
        highestFee: row.fee,
        freeAbove: row.free_above,
      });
    }
  }
  return areas;
}
