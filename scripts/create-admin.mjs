// Creates an admin account. This is the only way to get one: sign-up can't
// create admins, and the role can only be set with the secret key.
// Usage: npm run admin:create -- admin@example.com "Full Name"
// The password is generated and printed once. The admin pairs an authenticator
// app the first time they log in at /login/admin.

import { randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const [email, fullName] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!email?.includes("@") || !fullName) {
  console.error('Usage: npm run admin:create -- admin@example.com "Full Name"');
  process.exit(1);
}

if (!url || !secretKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local.",
  );
  process.exit(1);
}

const supabase = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const password = randomBytes(18).toString("base64url");
const { error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  app_metadata: { role: "admin" },
  user_metadata: { full_name: fullName },
});

if (error) {
  console.error(`Could not create the admin: ${error.message}`);
  process.exit(1);
}

console.log(`Admin created: ${email}`);
console.log(`Password (shown once): ${password}`);
