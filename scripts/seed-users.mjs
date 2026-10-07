// Creates or updates the demo accounts for each role.
// Usage: npm run db:seed  (reads .env.local)

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

const seedUsers = [
  { email: "patient@medease.com", role: "patient", fullName: "Ali Raza" },
  { email: "doctor@medease.com", role: "doctor", fullName: "Dr. Nida Ali" },
  { email: "lab@medease.com", role: "lab", fullName: "CityCare Diagnostics" },
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

for (const seed of seedUsers) {
  // The role goes in app_metadata so users can't change it themselves.
  const attributes = {
    password,
    email_confirm: true,
    app_metadata: { role: seed.role },
    user_metadata: { full_name: seed.fullName },
  };

  const match = existing.users.find((user) => user.email === seed.email);
  const { error } = match
    ? await supabase.auth.admin.updateUserById(match.id, attributes)
    : await supabase.auth.admin.createUser({
        email: seed.email,
        ...attributes,
      });

  if (error) {
    failed = true;
    console.error(`✗ ${seed.email}: ${error.message}`);
  } else {
    console.log(
      `✓ ${seed.email} (${seed.role}) ${match ? "updated" : "created"}`,
    );
  }
}

process.exit(failed ? 1 : 0);
