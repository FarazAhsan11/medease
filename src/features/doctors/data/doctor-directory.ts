import "server-only";

import { cache } from "react";
import { z } from "zod";

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
};

const COLUMNS =
  "id, full_name, gender, specialization, city, clinic_address, bio, experience_years, consultation_fee, slot_minutes, timezone, accepting_appointments, has_schedule";

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
  };
}

const param = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 80) ?? "";

export function parseDoctorSearch(
  params: Record<string, string | string[] | undefined>,
): DoctorSearch {
  const page = Number.parseInt(param(params.page), 10);
  return {
    q: param(params.q),
    specialty: param(params.specialty),
    gender: param(params.gender),
    city: param(params.city),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

// Characters with meaning in PostgREST filters or LIKE patterns.
const sanitize = (value: string) => value.replace(/[,()%*\\_.:]/g, " ").trim();

export async function searchDoctors(search: DoctorSearch) {
  const supabase = await createClient();
  let query = supabase
    .from("doctor_directory")
    .select(COLUMNS, { count: "exact" });

  if (search.specialty) query = query.eq("specialization", search.specialty);
  if (search.gender) query = query.eq("gender", search.gender);

  const city = sanitize(search.city);
  if (city) query = query.ilike("city", `%${city}%`);

  const q = sanitize(search.q);
  if (q) {
    query = query.or(
      `full_name.ilike.%${q}%,specialization.ilike.%${q}%,city.ilike.%${q}%`,
    );
  }

  const from = (search.page - 1) * DOCTORS_PER_PAGE;
  const { data, count, error } = await query
    .order("accepting_appointments", { ascending: false })
    .order("has_schedule", { ascending: false })
    .order("experience_years", { ascending: false })
    .order("full_name")
    .range(from, from + DOCTORS_PER_PAGE - 1)
    .returns<DoctorRow[]>();

  if (error) throw new Error(`doctor_directory: ${error.message}`);

  const total = count ?? 0;
  return {
    doctors: data.map(toDoctor),
    total,
    totalPages: Math.max(1, Math.ceil(total / DOCTORS_PER_PAGE)),
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
