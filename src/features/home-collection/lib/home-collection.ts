// Home collection setup (LAB-06): cities and fees, collection hours, slot
// capacity. Safe to import from client components. Design:
// docs/home-collection.md.

import { formatFee } from "@/lib/format";
import type { WeeklyRange } from "@/lib/weekly-hours";

// Match the checks on lab_collection_settings and lab_service_areas.
export const COLLECTION_SLOT_LENGTHS = [30, 60, 90, 120] as const;
export const NOTICE_HOURS = [1, 2, 3, 6, 12, 24] as const;
export const SLOT_CAPACITY = { min: 1, max: 20 } as const;
export const MAX_AREA_FEE = 10_000;
export const MAX_AREA_NOTE = 200;
export const MAX_FREE_ABOVE = 1_000_000;
// 3 ranges a day, 7 days.
export const MAX_COLLECTION_RANGES = 21;

export type CollectionSettings = {
  accepting: boolean;
  slotMinutes: number;
  capacity: number;
  noticeHours: number;
  freeAbove: number | null;
};

export type ServiceArea = {
  id: string;
  city: string;
  fee: number;
  note: string | null;
};

export type HomeCollectionSetup = {
  settings: CollectionSettings;
  hours: WeeklyRange[];
  areas: ServiceArea[];
};

// Where a lab collects at home, as patients comparing labs see it.
export type LabCollectionAreas = {
  cities: string[];
  lowestFee: number;
  highestFee: number;
  freeAbove: number | null;
};

// "Lahore, Sheikhupura" or "Lahore, Islamabad, Karachi and 2 more".
export function formatCollectionCities(cities: string[], shown = 3) {
  if (cities.length <= shown) return cities.join(", ");
  return `${cities.slice(0, shown).join(", ")} and ${cities.length - shown} more`;
}

// "free", "Rs 300 fee", "Rs 300–800 fee", "free in some cities, up to Rs 800",
// with "free over Rs 2,500" when set.
export function formatCollectionFee(areas: LabCollectionAreas) {
  const { lowestFee, highestFee, freeAbove } = areas;
  if (highestFee === 0) return "free";
  const fee =
    lowestFee === highestFee
      ? `${formatFee(lowestFee)} fee`
      : lowestFee === 0
        ? `free in some cities, up to ${formatFee(highestFee)}`
        : `${formatFee(lowestFee)}–${highestFee.toLocaleString("en-PK")} fee`;
  return freeAbove ? `${fee}, free over ${formatFee(freeAbove)}` : fee;
}

// What a lab starts with before saving anything.
export const DEFAULT_COLLECTION_SETTINGS: CollectionSettings = {
  accepting: false,
  slotMinutes: 60,
  capacity: 2,
  noticeHours: 2,
  freeAbove: null,
};

// "30 minutes", "1 hour", "1.5 hours", "2 hours".
export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = minutes / 60;
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

export const homeCollectionErrorMessages: Record<string, string> = {
  not_lab: "Only lab accounts can set up home collection.",
  not_permitted: "Only the lab admin can change home collection.",
  lab_not_found: "We couldn't find your lab's profile. Please contact support.",
  invalid_collection_settings:
    "Some of these settings aren't valid. Please check them.",
  invalid_schedule: "Some of these hours aren't valid. Please check them.",
  overlapping_hours: "Time ranges on the same day can't overlap.",
  no_collection_hours:
    "Add at least one day of collection hours before turning home collection on.",
  no_service_areas:
    "Add at least one city below before turning home collection on.",
  invalid_service_area:
    "Some of these details aren't valid. Please check them.",
  duplicate_service_area: "That city is already in your list. Edit it instead.",
  service_area_not_found:
    "That city isn't in your list any more. Reload the page.",
  last_service_area: "Turn home collection off before removing your last city.",
};
