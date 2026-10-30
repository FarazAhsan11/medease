// Database tests for the booking, call and verification rules (QA-02).
// Usage: npm run test:db  (reads .env.local; run the migrations first)
//
// Needs no local database: it runs against the project in .env.local with
// temporary accounts on example.invalid addresses, and deletes them at the end
// along with everything they own. Audit log entries stay, because that table
// is append-only by design. Sends no email: the app sends those, not the
// database.

import { createHmac, randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !secretKey || !publishableKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or SUPABASE_SECRET_KEY in .env.local.",
  );
  process.exit(1);
}

// Same guard as the seed script: never run against production.
const { hostname } = new URL(url);
const isLocal = ["localhost", "127.0.0.1"].includes(hostname);
const projectRef = hostname.split(".")[0];

if (
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL_ENV === "production"
) {
  console.error("Refusing to run: this looks like a production environment.");
  process.exit(1);
}

if (!isLocal && process.env.SEED_PROJECT_REF !== projectRef) {
  console.error(
    `Refusing to run against project "${projectRef}". If it's a dev/test project (never production), add this line to .env.local:\nSEED_PROJECT_REF=${projectRef}`,
  );
  process.exit(1);
}

const MINUTE = 60_000;
const TAG = "DB-TEST";
const BUCKET = "doctor-documents";

// fetch has no timeout of its own, so one dropped connection would otherwise
// hang the whole run. A retried write can only fail a test, not corrupt data.
async function fetchWithRetry(input, init) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetch(input, {
        ...init,
        signal: AbortSignal.timeout(20_000),
      });
    } catch (error) {
      if (attempt === 3) throw error;
    }
  }
}

const session = {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { fetch: fetchWithRetry },
};

const admin = createClient(url, secretKey, session);
const guest = createClient(url, publishableKey, session);

const createdUsers = [];
const uploadedFiles = [];
let failures = 0;
let passes = 0;

function check(label, ok, note = "") {
  if (ok) passes++;
  else failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${note ? `  (${note})` : ""}`);
}

const section = (title) => console.log(`\n== ${title} ==`);

// The function raised this exact code.
function refused(label, result, code) {
  check(
    label,
    result.error?.message === code,
    result.error?.message ?? "no error",
  );
}

// The caller has no rights at all, so PostgreSQL itself stopped them.
function denied(label, result) {
  check(
    label,
    result.error?.code === "42501",
    result.error?.code ?? "no error",
  );
}

function succeeded(label, result) {
  check(label, !result.error, result.error?.message ?? "");
}

function overlapRefused(label, result, constraint) {
  check(
    label,
    result.error?.code === "23P01" && result.error.message.includes(constraint),
    result.error?.code ?? "no error",
  );
}

async function createUser(role, { confirmed = true } = {}) {
  const email = `db-test-${randomUUID()}@example.invalid`;
  const password = `${randomUUID()}Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: confirmed,
    app_metadata: { role },
    user_metadata: { full_name: TAG },
  });
  if (error) throw new Error(`createUser: ${error.message}`);

  createdUsers.push(data.user.id);
  return { id: data.user.id, email, password };
}

async function signIn({ email, password }) {
  const client = createClient(url, publishableKey, session);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn: ${error.message}`);
  return client;
}

async function createDoctor({
  status = "approved",
  confirmed = true,
  accepting = true,
  documents = false,
} = {}) {
  const user = await createUser("doctor", { confirmed });
  const paths = documents
    ? {
        photo_path: `${user.id}/photo.jpg`,
        license_document_path: `${user.id}/license.pdf`,
        degree_path: `${user.id}/degree.pdf`,
      }
    : {};

  const profile = await admin.from("doctor_profiles").insert({
    id: user.id,
    first_name: "Db",
    last_name: "Test",
    phone: "+92 300 0000000",
    age: 40,
    gender: "Other",
    specialization: TAG,
    license_number: TAG,
    clinic_address: TAG,
    accepting_appointments: accepting,
    verification_status: status,
    ...paths,
  });
  if (profile.error) throw new Error(`profile: ${profile.error.message}`);

  const hours = await admin.from("doctor_availability").insert(
    [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      doctor_id: user.id,
      weekday,
      start_time: "09:00",
      end_time: "17:00",
    })),
  );
  if (hours.error) throw new Error(`hours: ${hours.error.message}`);

  return user;
}

const slotsOf = async (doctorId) => {
  const { data, error } = await guest.rpc("get_doctor_slots", {
    p_doctor_id: doctorId,
    p_days: 30,
  });
  if (error) throw new Error(`slots: ${error.message}`);
  return data;
};

const isListed = async (doctorId) => {
  const { data, error } = await guest
    .from("doctor_directory")
    .select("id")
    .eq("id", doctorId);
  if (error) throw new Error(`directory: ${error.message}`);
  return data.length === 1;
};

const statusOf = async (doctorId) => {
  const { data, error } = await admin
    .from("doctor_profiles")
    .select("verification_status, verification_note")
    .eq("id", doctorId)
    .single();
  if (error) throw new Error(`status: ${error.message}`);
  return data;
};

const insertAppointment = (fields) =>
  admin
    .from("appointments")
    .insert({
      doctor_name: TAG,
      doctor_specialization: TAG,
      consultation_fee: 0,
      timezone: "Asia/Karachi",
      patient_name: TAG,
      patient_email: "db-test@example.invalid",
      ...fields,
    })
    .select("id")
    .single();

// RFC 6238, so the tests can pass a real two-factor check.
function totp(secret) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret.replace(/=+$/, "").toUpperCase()]
    .map((char) => alphabet.indexOf(char).toString(2).padStart(5, "0"))
    .join("");
  const key = Buffer.from(
    bits.match(/.{8}/g).map((byte) => Number.parseInt(byte, 2)),
  );

  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));

  const hash = createHmac("sha1", key).update(counter).digest();
  const offset = hash[hash.length - 1] & 0xf;
  const value = hash.readUInt32BE(offset) & 0x7fffffff;
  return String(value % 1_000_000).padStart(6, "0");
}

async function passTwoFactor(client) {
  const { data, error } = await client.auth.mfa.enroll({ factorType: "totp" });
  if (error) throw new Error(`enroll: ${error.message}`);

  const verified = await client.auth.mfa.challengeAndVerify({
    factorId: data.id,
    code: totp(data.totp.secret),
  });
  if (verified.error) throw new Error(`verify: ${verified.error.message}`);
}

async function testDirectory({ patient }) {
  section("Who is listed (ADM-03, DIR-02, FIX-12)");

  const approved = await createDoctor();
  const hidden = {
    pending: await createDoctor({ status: "pending" }),
    "needing more information": await createDoctor({ status: "needs_info" }),
    rejected: await createDoctor({ status: "rejected" }),
    "approved without a confirmed email": await createDoctor({
      confirmed: false,
    }),
  };

  check("approved doctor is listed", await isListed(approved.id));
  check("approved doctor has slots", (await slotsOf(approved.id)).length > 0);

  for (const [label, doctor] of Object.entries(hidden)) {
    check(`doctor ${label} isn't listed`, !(await isListed(doctor.id)));
    check(
      `doctor ${label} has no slots`,
      (await slotsOf(doctor.id)).length === 0,
    );
    refused(
      `doctor ${label} can't be booked`,
      await patient.rpc("book_appointment", {
        p_doctor_id: doctor.id,
        p_starts_at: new Date(Date.now() + 48 * 60 * MINUTE).toISOString(),
      }),
      "doctor_not_found",
    );
  }

  succeeded(
    "the secret key can read the directory",
    await admin.from("doctor_directory").select("id").limit(1),
  );
  denied(
    "guests can't read doctor profiles",
    await guest.from("doctor_profiles").select("id"),
  );
}

async function testBooking({ patient, secondPatient, patientUser, thirdUser }) {
  section("Booking (APT-01, FIX-08)");

  const doctor = await createDoctor();
  const otherDoctor = await createDoctor();
  const paused = await createDoctor({ accepting: false });
  const doctorClient = await signIn(doctor);
  const slots = await slotsOf(doctor.id);
  const [first, second] = slots;
  const book = (client, doctorId, startsAt) =>
    client.rpc("book_appointment", {
      p_doctor_id: doctorId,
      p_starts_at: startsAt,
    });

  succeeded(
    "a patient books an open slot",
    await book(patient, doctor.id, first.starts_at),
  );
  refused(
    "a doctor can't book",
    await book(doctorClient, doctor.id, second.starts_at),
    "not_patient",
  );
  denied("a guest can't book", await book(guest, doctor.id, second.starts_at));
  refused(
    "a second patient can't take the same slot",
    await book(secondPatient, doctor.id, first.starts_at),
    "slot_taken",
  );
  refused(
    "one upcoming visit per doctor",
    await book(patient, doctor.id, second.starts_at),
    "already_booked_with_doctor",
  );
  refused(
    "a patient can't be in two places",
    await book(patient, otherDoctor.id, first.starts_at),
    "patient_time_conflict",
  );
  refused(
    "a time that isn't a slot is refused",
    await book(
      secondPatient,
      doctor.id,
      new Date(Date.parse(first.starts_at) + 7 * MINUTE).toISOString(),
    ),
    "slot_unavailable",
  );
  refused(
    "a paused doctor can't be booked",
    await book(patient, paused.id, first.starts_at),
    "not_accepting",
  );

  // The original bug: a booking that doesn't line up with today's slots, as
  // happens when a doctor changes their slot length.
  const free = await slotsOf(otherDoctor.id);
  const start = free.findIndex((slot, index) => {
    const run = free.slice(index, index + 4);
    return (
      run.length === 4 &&
      run.every(
        (item, offset) =>
          !item.is_booked &&
          (offset === 0 ||
            Date.parse(run[offset - 1].ends_at) === Date.parse(item.starts_at)),
      )
    );
  });
  const [before, startsIn, endsIn, after] = free.slice(start, start + 4);
  const length = Date.parse(startsIn.ends_at) - Date.parse(startsIn.starts_at);
  const from = Date.parse(startsIn.starts_at) + length / 2;
  const iso = (ms) => new Date(ms).toISOString();

  const straddling = await insertAppointment({
    doctor_id: otherDoctor.id,
    patient_id: patientUser.id,
    starts_at: iso(from),
    ends_at: iso(from + length),
  });
  succeeded("a booking across two slots is stored", straddling);

  const stateOf = (rows, slot) =>
    rows.find((row) => row.starts_at === slot.starts_at)?.is_booked;
  let rows = await slotsOf(otherDoctor.id);
  check("the slot it starts in shows booked", stateOf(rows, startsIn) === true);
  check("the slot it ends in shows booked", stateOf(rows, endsIn) === true);
  check("the slot before stays free", stateOf(rows, before) === false);
  check("the slot after stays free", stateOf(rows, after) === false);

  overlapRefused(
    "the database refuses an overlap for the doctor",
    await insertAppointment({
      doctor_id: otherDoctor.id,
      patient_id: thirdUser.id,
      starts_at: iso(from + 5 * MINUTE),
      ends_at: iso(from + length + 5 * MINUTE),
    }),
    "appointments_doctor_no_overlap",
  );
  overlapRefused(
    "the database refuses an overlap for the patient",
    await insertAppointment({
      doctor_id: doctor.id,
      patient_id: patientUser.id,
      starts_at: iso(from + 5 * MINUTE),
      ends_at: iso(from + length + 5 * MINUTE),
    }),
    "appointments_patient_no_overlap",
  );
  succeeded(
    "a back-to-back booking is allowed",
    await insertAppointment({
      doctor_id: otherDoctor.id,
      patient_id: thirdUser.id,
      starts_at: iso(from + length),
      ends_at: iso(from + 2 * length),
    }),
  );

  await admin
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", straddling.data.id);
  rows = await slotsOf(otherDoctor.id);
  check("cancelling frees the slot", stateOf(rows, startsIn) === false);
}

async function testCalls({ patient, patientUser, secondPatient }) {
  section("Call window (CALL-01, FIX-09)");

  const doctor = await createDoctor();
  const now = Date.now();
  const iso = (minutes) => new Date(now + minutes * MINUTE).toISOString();
  const cases = [
    { label: "60-minute slot, 50 minutes in", from: -50, to: 10, open: true },
    { label: "ended 20 minutes ago", from: -60, to: -20, open: false },
    { label: "10-minute slot, 25 minutes in", from: -25, to: -15, open: true },
    { label: "starts in 3 minutes", from: 3, to: 33, open: true },
    { label: "starts in 10 minutes", from: 10, to: 40, open: false },
  ];

  for (const { label, from, to, open } of cases) {
    const { data, error } = await insertAppointment({
      doctor_id: doctor.id,
      patient_id: patientUser.id,
      starts_at: iso(from),
      ends_at: iso(to),
    });
    if (error) throw new Error(`call appointment: ${error.message}`);

    const topic = { p_topic: `call:${data.id}` };
    const participant = await patient.rpc("can_join_call", topic);
    check(label, participant.data === open, `got ${participant.data}`);

    if (open) {
      const outsider = await secondPatient.rpc("can_join_call", topic);
      check(`${label}: a third user can't join`, outsider.data === false);
    }

    await admin.from("appointments").delete().eq("id", data.id);
  }
}

async function testDocuments({ patient }) {
  section("Doctors send documents (FIX-07)");

  const doctor = await createDoctor({ status: "pending" });
  const client = await signIn(doctor);
  const save = (who, paths) => who.rpc("save_verification_documents", paths);
  const licensePath = `${doctor.id}/license.pdf`;

  succeeded(
    "a doctor saves a document",
    await save(client, { p_license_path: licensePath }),
  );
  refused(
    "a patient can't use it",
    await save(patient, { p_license_path: licensePath }),
    "not_doctor",
  );
  denied(
    "a guest can't use it",
    await save(guest, { p_license_path: licensePath }),
  );
  refused(
    "a path in someone else's folder is refused",
    await save(client, { p_license_path: `${randomUUID()}/license.pdf` }),
    "invalid_path",
  );

  denied(
    "a doctor can't approve themself",
    await client
      .from("doctor_profiles")
      .update({ verification_status: "approved" })
      .eq("id", doctor.id),
  );
  check(
    "the status didn't change",
    (await statusOf(doctor.id)).verification_status === "pending",
  );

  const asked = await createDoctor({ status: "needs_info" });
  await admin
    .from("doctor_profiles")
    .update({ verification_note: TAG })
    .eq("id", asked.id);
  const askedClient = await signIn(asked);
  succeeded(
    "new documents answer a request",
    await save(askedClient, { p_degree_path: `${asked.id}/degree.pdf` }),
  );
  const answered = await statusOf(asked.id);
  check(
    "the doctor goes back into the queue, note cleared",
    answered.verification_status === "pending" &&
      answered.verification_note === null,
  );

  for (const status of ["approved", "rejected"]) {
    const closed = await createDoctor({ status });
    refused(
      `${status} doctors can't replace their files`,
      await save(await signIn(closed), {
        p_license_path: `${closed.id}/license.pdf`,
      }),
      "verification_closed",
    );
  }
}

async function testReview({ patient, thirdUser }) {
  section("Admins review doctors (ADM-01, ADM-02)");

  const adminUser = await createUser("admin");
  const passwordOnly = await signIn(adminUser);
  const verified = await signIn(adminUser);
  await passTwoFactor(verified);

  const doctor = await createDoctor({ status: "pending", documents: true });
  const doctorClient = await signIn(doctor);
  const review = (client, doctorId, decision, note) =>
    client.rpc("admin_review_doctor", {
      p_doctor_id: doctorId,
      p_decision: decision,
      p_note: note,
    });

  refused(
    "a patient can't review",
    await review(patient, doctor.id, "approved"),
    "not_admin",
  );
  refused(
    "a doctor can't approve themself",
    await review(doctorClient, doctor.id, "approved"),
    "not_admin",
  );
  refused(
    "an admin without two-factor can't review",
    await review(passwordOnly, doctor.id, "approved"),
    "not_admin",
  );
  refused(
    "the secret key alone can't review",
    await review(admin, doctor.id, "approved"),
    "not_admin",
  );
  denied("a guest can't review", await review(guest, doctor.id, "approved"));
  check(
    "after all that the doctor is still pending",
    (await statusOf(doctor.id)).verification_status === "pending",
  );

  refused(
    "an unknown decision is refused",
    await review(verified, doctor.id, "maybe"),
    "invalid_decision",
  );
  refused(
    "asking for information needs a note",
    await review(verified, doctor.id, "needs_info", "   "),
    "note_required",
  );
  refused(
    "rejecting needs a note",
    await review(verified, doctor.id, "rejected"),
    "note_required",
  );
  refused(
    "an unknown doctor is refused",
    await review(verified, randomUUID(), "approved"),
    "doctor_not_found",
  );

  const noDocuments = await createDoctor({ status: "pending" });
  refused(
    "approval needs all three documents",
    await review(verified, noDocuments.id, "approved"),
    "documents_missing",
  );
  const unconfirmed = await createDoctor({
    status: "pending",
    confirmed: false,
    documents: true,
  });
  refused(
    "approval needs a confirmed email",
    await review(verified, unconfirmed.id, "approved"),
    "email_not_confirmed",
  );

  check("before approval they aren't listed", !(await isListed(doctor.id)));
  const approval = await review(verified, doctor.id, "approved");
  check("an admin approves", approval.data === doctor.email);
  check("after approval they're listed", await isListed(doctor.id));
  check(
    "after approval they have slots",
    (await slotsOf(doctor.id)).length > 0,
  );
  refused(
    "a doctor can't be reviewed twice",
    await review(verified, doctor.id, "rejected", TAG),
    "already_reviewed",
  );

  const asked = await createDoctor({ status: "pending" });
  succeeded(
    "an admin asks for more information",
    await review(verified, asked.id, "needs_info", TAG),
  );
  const askedRead = await (
    await signIn(asked)
  )
    .from("doctor_profiles")
    .select("verification_status, verification_note")
    .eq("id", asked.id)
    .single();
  check(
    "the doctor can read the request",
    askedRead.data?.verification_status === "needs_info" &&
      askedRead.data?.verification_note === TAG,
  );
  check("they stay hidden meanwhile", !(await isListed(asked.id)));

  const rejected = await createDoctor({ status: "pending" });
  succeeded(
    "an admin rejects",
    await review(verified, rejected.id, "rejected", TAG),
  );
  check("a rejected doctor stays hidden", !(await isListed(rejected.id)));

  section("Admin reads (ADM-02, ADM-05, SEC-04)");

  refused(
    "a doctor can't list the queue",
    await doctorClient.rpc("admin_doctor_reviews"),
    "not_admin",
  );
  refused(
    "an admin without two-factor can't list the queue",
    await passwordOnly.rpc("admin_doctor_reviews"),
    "not_admin",
  );
  denied(
    "a guest can't list the queue",
    await guest.rpc("admin_doctor_reviews"),
  );

  const queue = await verified.rpc("admin_doctor_reviews", {
    p_doctor_id: doctor.id,
  });
  check(
    "an admin reads one doctor, with their email",
    queue.data?.length === 1 && queue.data[0].email === doctor.email,
  );

  const log = await verified.rpc("admin_audit_log", { p_user_id: doctor.id });
  check(
    "the approval is in the audit log",
    log.data?.some(
      (entry) =>
        entry.action === "doctor.approved" &&
        entry.actor_id === adminUser.id &&
        entry.actor_role === "admin",
    ),
  );
  const refusals = await verified.rpc("admin_audit_log", {
    p_user_id: noDocuments.id,
  });
  check("a refused decision writes nothing", refusals.data?.length === 0);

  const filtered = await verified.rpc("admin_audit_log", {
    p_action: "doctor.rejected",
    p_user_id: rejected.id,
  });
  check("the log filters by action", filtered.data?.length === 1);
  const future = await verified.rpc("admin_audit_log", {
    p_user_id: doctor.id,
    p_from: new Date(Date.now() + 60 * MINUTE).toISOString(),
  });
  check("the log filters by date", future.data?.length === 0);

  refused(
    "a doctor can't read the audit log",
    await doctorClient.rpc("admin_audit_log"),
    "not_admin",
  );
  refused(
    "an admin without two-factor can't read the audit log",
    await passwordOnly.rpc("admin_audit_log"),
    "not_admin",
  );

  section("The audit log is append-only (SEC-04)");

  denied(
    "signed-in users can't read the table",
    await verified.from("audit_log").select("id"),
  );
  denied(
    "the secret key can't update it",
    await admin
      .from("audit_log")
      .update({ action: TAG })
      .eq("target_id", doctor.id),
  );
  denied(
    "the secret key can't delete from it",
    await admin.from("audit_log").delete().eq("target_id", doctor.id),
  );
  denied(
    "the secret key can't write to it directly",
    await admin.from("audit_log").insert({ action: TAG }),
  );

  section("Document links (ADM-02, SEC-07)");

  const path = doctor.id + "/license.pdf";
  const upload = await admin.storage
    .from(BUCKET)
    .upload(path, Buffer.from("%PDF-1.4 db test"), {
      contentType: "application/pdf",
      upsert: true,
    });
  check("a test document uploads", !upload.error, upload.error?.message ?? "");
  uploadedFiles.push(path);

  const sign = (client) =>
    client.storage.from(BUCKET).createSignedUrl(path, 300);
  const adminLink = await sign(verified);
  check("an admin gets a link", Boolean(adminLink.data?.signedUrl));
  if (adminLink.data?.signedUrl) {
    const opened = await fetch(adminLink.data.signedUrl);
    check("the link opens the file", opened.status === 200);
  }
  check(
    "the doctor gets a link to their own file",
    Boolean((await sign(doctorClient)).data?.signedUrl),
  );
  check(
    "an admin without two-factor gets none",
    !(await sign(passwordOnly)).data?.signedUrl,
  );
  check("a patient gets none", !(await sign(patient)).data?.signedUrl);
  check(
    "another user gets none",
    !(await sign(await signIn(thirdUser))).data?.signedUrl,
  );
}

async function testDirectUploads() {
  section("Direct uploads to Storage (FIX-26)");

  const doctor = await createDoctor({ status: "pending" });
  const doctorClient = await signIn(doctor);
  const storageOf = (client) => client.storage.from(BUCKET);
  const pdf = Buffer.from("%PDF-1.4 db test");

  async function signedLink() {
    const path = `${doctor.id}/license-${randomUUID()}.pdf`;
    const { data, error } = await storageOf(admin).createSignedUploadUrl(path);
    if (error) throw new Error(`signed link: ${error.message}`);
    uploadedFiles.push(path);
    return data;
  }

  const upload = (link, body = pdf, contentType = "application/pdf") =>
    storageOf(guest).uploadToSignedUrl(link.path, link.token, body, {
      contentType,
    });

  const link = await signedLink();
  succeeded("a signed link accepts a file", await upload(link));

  const info = await storageOf(admin).info(link.path);
  check(
    "the server can see what arrived",
    info.data?.size === pdf.length &&
      info.data?.contentType === "application/pdf",
    info.error?.message ?? "",
  );

  check(
    "a link can't overwrite the file",
    Boolean((await upload(link, Buffer.from("%PDF-1.4 swapped"))).error),
  );

  const otherLink = await signedLink();
  check(
    "a link only works for its own path",
    Boolean((await upload({ path: otherLink.path, token: link.token })).error),
  );

  const html = await signedLink();
  check(
    "the bucket refuses other file types",
    Boolean((await upload(html, Buffer.from("<script>"), "text/html")).error),
  );

  const huge = await signedLink();
  check(
    "the bucket refuses files over 5 MB",
    Boolean((await upload(huge, Buffer.alloc(5 * 1024 * 1024 + 1))).error),
  );

  const stray = `${doctor.id}/license-${randomUUID()}.pdf`;
  uploadedFiles.push(stray);
  const uploadDirectly = (client) =>
    storageOf(client).upload(stray, pdf, { contentType: "application/pdf" });
  check(
    "guests can't upload without a link",
    Boolean((await uploadDirectly(guest)).error),
  );
  check(
    "signed-in doctors can't upload without a link",
    Boolean((await uploadDirectly(doctorClient)).error),
  );
}

async function cleanUp() {
  section("Clean up");

  if (uploadedFiles.length > 0) {
    await admin.storage.from(BUCKET).remove(uploadedFiles);
  }
  await Promise.all(createdUsers.map((id) => admin.auth.admin.deleteUser(id)));

  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`listUsers: ${error.message}`);
  check(
    "every temporary account is gone",
    !data.users.some((user) => user.email?.startsWith("db-test-")),
  );
}

try {
  const patientUser = await createUser("patient");
  const secondPatientUser = await createUser("patient");
  const thirdUser = await createUser("patient");
  const context = {
    patientUser,
    thirdUser,
    patient: await signIn(patientUser),
    secondPatient: await signIn(secondPatientUser),
  };

  await testDirectory(context);
  await testBooking(context);
  await testCalls(context);
  await testDocuments(context);
  await testReview(context);
  await testDirectUploads();
} catch (error) {
  failures++;
  console.log(`ABORTED: ${error.message}`);
} finally {
  await cleanUp();
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
