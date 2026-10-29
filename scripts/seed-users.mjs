// Creates or updates the demo accounts, their profiles and doctor hours.
// Usage: npm run db:seed  (reads .env.local; run the migrations first)

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const password = process.env.SEED_USER_PASSWORD;

if (!url || !secretKey || !password) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, or SEED_USER_PASSWORD in .env.local.",
  );
  process.exit(1);
}

// Demo accounts share one password, so they must never exist in production.
// Seed only a local Supabase, or the project named in SEED_PROJECT_REF, which
// confirms it's a dev/test project; swapping in production keys then fails.
const { hostname } = new URL(url);
const isLocal = ["localhost", "127.0.0.1"].includes(hostname);
const projectRef = hostname.split(".")[0];
const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL_ENV === "production";

if (isProduction) {
  console.error(
    "Refusing to seed: this looks like a production environment (NODE_ENV or VERCEL_ENV is production). Demo accounts must never be created there.",
  );
  process.exit(1);
}

if (!isLocal && process.env.SEED_PROJECT_REF !== projectRef) {
  console.error(
    `Refusing to seed project "${projectRef}". If it's a dev/test project (never production), add this line to .env.local:\nSEED_PROJECT_REF=${projectRef}`,
  );
  process.exit(1);
}

// Weekdays: 0 = Sunday … 6 = Saturday. Times are clinic time (Asia/Karachi).
const weekdays = (days, start, end) =>
  days.map((weekday) => ({ weekday, start_time: start, end_time: end }));

const doctors = [
  {
    email: "mfarazahsan710+d1@gmail.com",
    profile: {
      first_name: "Ayesha",
      last_name: "Siddiqui",
      phone: "+92 300 4815162",
      age: 41,
      gender: "Female",
      specialization: "Cardiologist",
      license_number: "PMC-48213-L",
      city: "Lahore",
      clinic_address:
        "Heart Care Clinic, 12-B Main Boulevard, Gulberg III, Lahore",
      experience_years: 14,
      consultation_fee: 4500,
      slot_minutes: 30,
      bio: "Consultant cardiologist with 14 years of experience in hypertension, chest pain and heart rhythm problems. Trained at King Edward Medical University and believes in clear, unhurried explanations.",
    },
    hours: [
      ...weekdays([1, 2, 3, 4, 5], "10:00", "13:00"),
      ...weekdays([1, 2, 3, 4, 5], "17:00", "20:00"),
      ...weekdays([6], "10:00", "13:00"),
    ],
  },
  {
    email: "mfarazahsan710+d2@gmail.com",
    profile: {
      first_name: "Hamza",
      last_name: "Qureshi",
      phone: "+92 321 7788990",
      age: 35,
      gender: "Male",
      specialization: "Dermatologist",
      license_number: "PMC-61027-S",
      city: "Karachi",
      clinic_address:
        "SkinWise Clinic, Plot 23-C, Khayaban-e-Ittehad, DHA Phase 6, Karachi",
      experience_years: 9,
      consultation_fee: 3500,
      slot_minutes: 20,
      bio: "Dermatologist focused on acne, eczema, hair loss and skin allergies. Practical treatment plans that fit everyday routines.",
    },
    hours: [
      ...weekdays([1, 3, 4], "14:00", "19:00"),
      ...weekdays([6], "11:00", "16:00"),
    ],
  },
  {
    email: "mfarazahsan710+d3@gmail.com",
    profile: {
      first_name: "Mariam",
      last_name: "Farooq",
      phone: "+92 333 5566771",
      age: 38,
      gender: "Female",
      specialization: "Pediatrician",
      license_number: "PMC-53390-P",
      city: "Islamabad",
      clinic_address:
        "Little Steps Children's Clinic, Office 4, Beverly Centre, Blue Area, Islamabad",
      experience_years: 11,
      consultation_fee: 3000,
      slot_minutes: 15,
      bio: "Pediatrician caring for newborns to teenagers: vaccinations, growth checks, fevers and childhood asthma. Calm, family-friendly visits.",
    },
    hours: weekdays([1, 2, 3, 4, 5, 6], "09:00", "14:00"),
  },
];

const accounts = [
  ...doctors.map((doctor) => ({
    email: doctor.email,
    role: "doctor",
    fullName: `Dr. ${doctor.profile.first_name} ${doctor.profile.last_name}`,
    table: "doctor_profiles",
    profile: doctor.profile,
    hours: doctor.hours,
  })),
  {
    email: "patient@medease.com",
    role: "patient",
    fullName: "Ali Raza",
    table: "patient_profiles",
    profile: { first_name: "Ali", last_name: "Raza", phone: "+92 300 1234567" },
  },
  {
    email: "lab@medease.com",
    role: "lab",
    fullName: "CityCare Diagnostics",
    table: "lab_profiles",
    profile: {
      lab_name: "CityCare Diagnostics",
      registration_number: "LAB-10293",
      contact_person: "Imran Sheikh",
      phone: "+92 51 2345678",
      address: "Plot 7, Jinnah Avenue, Blue Area, Islamabad",
      services: ["Home sample collection", "Online reports"],
    },
  },
];

const supabase = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existing, error: listError } =
  await supabase.auth.admin.listUsers({ perPage: 1000 });

if (listError) {
  console.error("Could not list users:", listError.message);
  process.exit(1);
}

let failed = false;

for (const account of accounts) {
  try {
    // The role goes in app_metadata so users can't change it themselves.
    const attributes = {
      password,
      email_confirm: true,
      app_metadata: { role: account.role },
      user_metadata: { full_name: account.fullName },
    };

    const match = existing.users.find((user) => user.email === account.email);
    const { data, error } = match
      ? await supabase.auth.admin.updateUserById(match.id, attributes)
      : await supabase.auth.admin.createUser({
          email: account.email,
          ...attributes,
        });
    if (error) throw error;

    const userId = data.user.id;
    const { error: profileError } = await supabase
      .from(account.table)
      .upsert({ id: userId, ...account.profile });
    if (profileError) throw profileError;

    if (account.hours) {
      const { error: clearError } = await supabase
        .from("doctor_availability")
        .delete()
        .eq("doctor_id", userId);
      if (clearError) throw clearError;

      const { error: hoursError } = await supabase
        .from("doctor_availability")
        .insert(
          account.hours.map((range) => ({ doctor_id: userId, ...range })),
        );
      if (hoursError) throw hoursError;
    }

    console.log(
      `✓ ${account.email.padEnd(30)} ${account.role.padEnd(8)} ${account.fullName} (${match ? "updated" : "created"})`,
    );
  } catch (error) {
    failed = true;
    console.error(`✗ ${account.email}: ${error.message}`);
  }
}

if (failed) {
  console.error(
    "\nSome accounts failed. If a table is missing, run the SQL files in supabase/migrations first.",
  );
}

process.exit(failed ? 1 : 0);
