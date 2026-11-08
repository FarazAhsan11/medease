import "server-only";

import { cache } from "react";
import { z } from "zod";

import {
  isPastLastPage,
  likePattern,
  pageCount,
  pageParam,
  pageRange,
  searchParam,
} from "@/lib/directory-search";
import { createClient } from "@/lib/supabase/server";

export const DOCTORS_PER_PAGE = 6;

export type DirectoryDoctor = {
  id: string;
  fullName: string;
  gender: string;
  specialization: string;
  city: string | null;
  clinicAddress: string;
  bio: string | null;
  experienceYears: number;
  consultationFee: number;
  slotMinutes: number;
  timezone: string;
  acceptingAppointments: boolean;
  hasSchedule: boolean;
  licenseNumber: string;
};

export type WeeklyHours = { weekday: number; start: string; end: string };

export type DoctorSearch = {
  q: string;
  specialty: string;
  gender: string;
  city: string;
  page: number;
};

type DoctorRow = {
  id: string;
  full_name: string;
  gender: string;
  specialization: string;
  city: string | null;
  clinic_address: string;
  bio: string | null;
  experience_years: number;
  consultation_fee: number;
  slot_minutes: number;
  timezone: string;
  accepting_appointments: boolean;
  has_schedule: boolean;
  license_number: string;
};

const COLUMNS =
  "id, full_name, gender, specialization, city, clinic_address, bio, experience_years, consultation_fee, slot_minutes, timezone, accepting_appointments, has_schedule, license_number";

function toDoctor(row: DoctorRow): DirectoryDoctor {
  return {
    id: row.id,
    fullName: row.full_name,
    gender: row.gender,
    specialization: row.specialization,
    city: row.city,
    clinicAddress: row.clinic_address,
    bio: row.bio,
    experienceYears: row.experience_years,
    consultationFee: row.consultation_fee,
    slotMinutes: row.slot_minutes,
    timezone: row.timezone,
    acceptingAppointments: row.accepting_appointments,
    hasSchedule: row.has_schedule,
    licenseNumber: row.license_number,
  };
}

export function parseDoctorSearch(
  params: Record<string, string | string[] | undefined>,
): DoctorSearch {
  return {
    q: searchParam(params.q),
    specialty: searchParam(params.specialty),
    gender: searchParam(params.gender),
    city: searchParam(params.city),
    page: pageParam(params.page),
  };
}

export async function searchDoctors(search: DoctorSearch) {
  const supabase = await createClient();
  const city = likePattern(search.city);
  const q = likePattern(search.q);
  const fetchPage = (page: number) => {
    let query = supabase
      .from("doctor_directory")
      .select(COLUMNS, { count: "exact" });
    if (search.specialty) query = query.eq("specialization", search.specialty);
    if (search.gender) query = query.eq("gender", search.gender);
    if (city) query = query.ilike("city", city);
    if (q) {
      query = query.or(
        `full_name.ilike.${q},specialization.ilike.${q},city.ilike.${q}`,
      );
    }
    return query
      .order("accepting_appointments", { ascending: false })
      .order("has_schedule", { ascending: false })
      .order("experience_years", { ascending: false })
      .order("full_name")
      .range(...pageRange(page, DOCTORS_PER_PAGE))
      .returns<DoctorRow[]>();
  };

  let page = search.page;
  let result = await fetchPage(page);
  if (page > 1 && isPastLastPage(result.error)) {
    page = 1;
    result = await fetchPage(page);
  }
  const { data, count, error } = result;
  if (error) throw new Error(`doctor_directory: ${error.message}`);

  const total = count ?? 0;
  return {
    page,
    doctors: data.map(toDoctor),
    total,
    totalPages: pageCount(total, DOCTORS_PER_PAGE),
  };
}

// Cached per request: the booking page and its metadata both need it.
export const getDirectoryDoctor = cache(async (id: string) => {
  if (!z.uuid().safeParse(id).success) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("doctor_directory")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle<DoctorRow>();

  if (error) throw new Error(`doctor_directory: ${error.message}`);
  return data ? toDoctor(data) : null;
});

export async function getWeeklyHours(doctorId: string): Promise<WeeklyHours[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("doctor_availability")
    .select("weekday, start_time, end_time")
    .eq("doctor_id", doctorId)
    .order("weekday")
    .order("start_time")
    .returns<{ weekday: number; start_time: string; end_time: string }[]>();

  if (error) throw new Error(`doctor_availability: ${error.message}`);

  return data.map((row) => ({
    weekday: row.weekday,
    start: row.start_time.slice(0, 5),
    end: row.end_time.slice(0, 5),
  }));
}
