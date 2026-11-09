// Tests for the migrations and every database rule (QA-02).
// Usage: npm run test:sql
//
// Applies every migration to a fresh throwaway Postgres (see
// scripts/lib/test-database.mjs), then calls each function as a guest, a patient,
// a doctor, an admin or the secret key would. Needs no Docker, no network and no
// Supabase project, and touches nothing real. `npm run test:db` is the other half:
// it covers what needs real Supabase services (Auth, two-factor, Storage).
//
// The last section fails if a `raise exception` in any function has no test, so a
// new refusal can't ship unchecked.

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  callAs,
  createOlderDatabase,
  createTestDatabase,
} from "./lib/test-database.mjs";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const TAG = "SQL-TEST";

const { db } = await createTestDatabase().catch((error) => {
  console.error(`FAIL  the migrations don't apply: ${error.message}`);
  process.exit(1);
});

let passes = 0;
let failures = 0;
const refusalsSeen = new Set();

function check(label, ok, note = "") {
  if (ok) passes++;
  else failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${note ? `  (${note})` : ""}`);
}

const section = (title) => console.log(`\n== ${title} ==`);

// Calls a database function the way the API does, with named arguments.
async function rpc(caller, fn, args = {}, schema = "public") {
  const names = Object.keys(args);
  const list = names.map((name, index) => `${name} => $${index + 1}`);
  const result = await callAs(
    db,
    caller,
    `select * from ${schema}.${fn}(${list.join(", ")})`,
    names.map((name) => args[name]),
  );
  return { ...result, fn };
}

const as = (caller, sql, params) => callAs(db, caller, sql, params);

// The function raised this exact code.
function refused(label, result, code) {
  if (result.fn) refusalsSeen.add(`${result.fn}:${code}`);
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

// Fixtures, written directly as the database owner ----------------------------

async function createUser(role, { confirmed = true, consented = true } = {}) {
  const email = `${randomUUID()}@example.invalid`;
  const { rows } = await db.query(
    `insert into auth.users (email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
     values ($1, $2, $3, $4) returning id`,
    [email, confirmed ? new Date() : null, { role }, { full_name: TAG }],
  );
  // Booking needs this, so it's the normal case for a patient.
  if (role === "patient" && consented) {
    await db.query(
      `insert into public.user_consents (user_id, document, version)
       values ($1, 'telemedicine-consent', '1.0')`,
      [rows[0].id],
    );
  }
  // The app won't let these roles past two-factor, so that's the normal case;
  // tests for the rule itself ask for aal1.
  const aal = ["doctor", "lab", "admin"].includes(role) ? "aal2" : "aal1";
  return { id: rows[0].id, role, email, aal };
}

async function createPatient() {
  const user = await createUser("patient");
  await db.query(
    `insert into public.patient_profiles (id, first_name, last_name, phone)
     values ($1, 'Sql', 'Patient', '+92 300 0000000')`,
    [user.id],
  );
  return user;
}

async function createDoctor({
  status = "approved",
  confirmed = true,
  accepting = true,
  documents = false,
} = {}) {
  const user = await createUser("doctor", { confirmed });
  const file = (name) => (documents ? `${user.id}/${name}` : null);

  await db.query(
    `insert into public.doctor_profiles (
       id, first_name, last_name, phone, age, gender, specialization,
       license_number, clinic_address, accepting_appointments,
       verification_status, photo_path, license_document_path, degree_path
     ) values ($1, 'Sql', 'Doctor', '+92 300 0000000', 40, 'Other', $2, $2, $2,
       $3, $4, $5, $6, $7)`,
    [
      user.id,
      TAG,
      accepting,
      status,
      file("photo.jpg"),
      file("license.pdf"),
      file("degree.pdf"),
    ],
  );

  for (let weekday = 0; weekday < 7; weekday++) {
    await db.query(
      `insert into public.doctor_availability (doctor_id, weekday, start_time, end_time)
       values ($1, $2, '09:00', '17:00')`,
      [user.id, weekday],
    );
  }

  return user;
}

async function createAppointment(doctor, patient, fields = {}) {
  const {
    from = 60,
    to = from + 30,
    status = "booked",
    email = patient.email,
  } = fields;
  const now = Date.now();
  const { rows } = await db.query(
    `insert into public.appointments (
       doctor_id, patient_id, starts_at, ends_at, status, doctor_name,
       doctor_specialization, consultation_fee, timezone, patient_name, patient_email
     ) values ($1, $2, $3, $4, $5, $6, $6, 0, 'Asia/Karachi', $6, $7) returning id`,
    [
      doctor.id,
      patient.id,
      new Date(now + from * MINUTE),
      new Date(now + to * MINUTE),
      status,
      TAG,
      email,
    ],
  );
  return rows[0].id;
}

const appointmentRow = async (id) =>
  (await db.query(`select * from public.appointments where id = $1`, [id]))
    .rows[0];

const slotsOf = async (doctorId) => {
  const { data, error } = await rpc(null, "get_doctor_slots", {
    p_doctor_id: doctorId,
    p_days: 30,
  });
  if (error) throw new Error(`slots: ${error.message}`);
  return data;
};

const isListed = async (doctorId) => {
  const { data, error } = await as(
    null,
    `select id from public.doctor_directory where id = $1`,
    [doctorId],
  );
  if (error) throw new Error(`directory: ${error.message}`);
  return data.length === 1;
};

const hoursOf = async (doctorId) =>
  (
    await db.query(
      `select weekday, start_time, end_time from public.doctor_availability
       where doctor_id = $1 order by weekday, start_time`,
      [doctorId],
    )
  ).rows;

const doctorRow = async (id) =>
  (await db.query(`select * from public.doctor_profiles where id = $1`, [id]))
    .rows[0];

const medicine = (fields = {}) => ({
  medicine: "Amoxicillin",
  strength: "500 mg",
  form: "capsule",
  dose: "1 capsule",
  frequency: "daily",
  dose_times: ["morning", "night"],
  meal: "after_food",
  duration_days: 5,
  ...fields,
});

const startedVisit = (doctor, patient, fields) =>
  createAppointment(doctor, patient, { from: -30, to: 0, ...fields });

const issue = (caller, appointmentId, fields = {}) =>
  rpc(caller, "issue_prescription", {
    p_appointment_id: appointmentId,
    p_items: [medicine()],
    ...fields,
  });

const issued = (result) => result.data?.[0]?.issue_prescription;

// Tests -----------------------------------------------------------------------

async function testDirectory({ patient }) {
  section("Who is listed (ADM-03, DIR-02, FIX-12)");

  const approved = await createDoctor();
  const hidden = {
    pending: await createDoctor({ status: "pending" }),
    "needing more information": await createDoctor({ status: "needs_info" }),
    rejected: await createDoctor({ status: "rejected" }),
    "without a confirmed email": await createDoctor({ confirmed: false }),
  };

  check("an approved doctor is listed", await isListed(approved.id));
  check(
    "an approved doctor has slots",
    (await slotsOf(approved.id)).length > 0,
  );

  for (const [label, doctor] of Object.entries(hidden)) {
    check(`a doctor ${label} isn't listed`, !(await isListed(doctor.id)));
    check(
      `a doctor ${label} has no slots`,
      (await slotsOf(doctor.id)).length === 0,
    );
    refused(
      `a doctor ${label} can't be booked`,
      await rpc(patient, "book_appointment", {
        p_doctor_id: doctor.id,
        p_starts_at: new Date(Date.now() + 2 * DAY),
      }),
      "doctor_not_found",
    );
  }

  succeeded(
    "the secret key can read the directory",
    await as(
      { role: "service_role" },
      `select id from public.doctor_directory limit 1`,
    ),
  );
  denied(
    "guests can't read doctor profiles",
    await as(null, `select id from public.doctor_profiles`),
  );
}

async function testBooking({ patient, secondPatient, thirdPatient }) {
  section("Booking (APT-01, FIX-08)");

  const doctor = await createDoctor();
  const otherDoctor = await createDoctor();
  const paused = await createDoctor({ accepting: false });
  const [first, second] = await slotsOf(doctor.id);
  const book = (caller, doctorId, startsAt, reason) =>
    rpc(caller, "book_appointment", {
      p_doctor_id: doctorId,
      p_starts_at: startsAt,
      p_reason: reason,
    });

  const booked = await book(
    patient,
    doctor.id,
    first.starts_at,
    `  ${"x".repeat(600)}  `,
  );
  succeeded("a patient books an open slot", booked);
  const row = booked.data?.[0]?.book_appointment;
  check(
    "the booking snapshots the doctor and the patient",
    row?.doctor_name === "Dr. Sql Doctor" &&
      row?.patient_name === "Sql Patient" &&
      row?.patient_email === patient.email &&
      row?.doctor_email === doctor.email,
  );
  check("the reason is trimmed to 500", row?.reason?.length === 500);

  refused(
    "a doctor can't book",
    await book(doctor, doctor.id, second.starts_at),
    "not_patient",
  );
  denied("a guest can't book", await book(null, doctor.id, second.starts_at));
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
      new Date(Date.parse(first.starts_at) + 7 * MINUTE),
    ),
    "slot_unavailable",
  );
  refused(
    "a slot in the past is refused",
    await book(secondPatient, doctor.id, new Date(Date.now() - DAY)),
    "slot_unavailable",
  );
  refused(
    "a paused doctor can't be booked",
    await book(patient, paused.id, first.starts_at),
    "not_accepting",
  );

  denied(
    "a patient can't write an appointment directly",
    await as(
      patient,
      `update public.appointments set status = 'completed' where patient_id = $1`,
      [patient.id],
    ),
  );

  section("Overlaps stay impossible (FIX-08)");

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
  const insertAt = (doctorId, patientId, startMs, endMs) =>
    db
      .query(
        `insert into public.appointments (
           doctor_id, patient_id, starts_at, ends_at, doctor_name,
           doctor_specialization, consultation_fee, timezone, patient_name, patient_email
         ) values ($1, $2, $3, $4, $5, $5, 0, 'UTC', $5, $5) returning id`,
        [doctorId, patientId, new Date(startMs), new Date(endMs), TAG],
      )
      .then(
        ({ rows }) => ({ data: rows, error: null }),
        (error) => ({
          data: null,
          error: { message: error.message, code: error.code },
        }),
      );

  const straddling = await insertAt(
    otherDoctor.id,
    patient.id,
    from,
    from + length,
  );
  succeeded("a booking across two slots is stored", straddling);

  const stateOf = (rows, slot) =>
    rows.find((item) => item.starts_at.getTime() === slot.starts_at.getTime())
      ?.is_booked;
  let rows = await slotsOf(otherDoctor.id);
  check("the slot it starts in shows booked", stateOf(rows, startsIn) === true);
  check("the slot it ends in shows booked", stateOf(rows, endsIn) === true);
  check("the slot before stays free", stateOf(rows, before) === false);
  check("the slot after stays free", stateOf(rows, after) === false);

  overlapRefused(
    "the database refuses an overlap for the doctor",
    await insertAt(
      otherDoctor.id,
      thirdPatient.id,
      from + 5 * MINUTE,
      from + length + 5 * MINUTE,
    ),
    "appointments_doctor_no_overlap",
  );
  overlapRefused(
    "the database refuses an overlap for the patient",
    await insertAt(
      doctor.id,
      patient.id,
      from + 5 * MINUTE,
      from + length + 5 * MINUTE,
    ),
    "appointments_patient_no_overlap",
  );
  succeeded(
    "a back-to-back booking is allowed",
    await insertAt(
      otherDoctor.id,
      thirdPatient.id,
      from + length,
      from + 2 * length,
    ),
  );

  await db.query(
    `update public.appointments set status = 'cancelled' where id = $1`,
    [straddling.data[0].id],
  );
  rows = await slotsOf(otherDoctor.id);
  check("cancelling frees the slot", stateOf(rows, startsIn) === false);
}

async function testCancel({ patient, secondPatient }) {
  section("Cancelling (APT-02)");

  const doctor = await createDoctor();
  const otherDoctor = await createDoctor();
  const cancel = (caller, id, reason) =>
    rpc(caller, "cancel_appointment", {
      p_appointment_id: id,
      p_reason: reason,
    });

  const mine = await createAppointment(doctor, patient);
  denied("a guest can't cancel", await cancel(null, mine));
  refused(
    "a third user can't cancel it",
    await cancel(secondPatient, mine),
    "appointment_not_found",
  );
  refused(
    "another doctor can't cancel it",
    await cancel(otherDoctor, mine),
    "appointment_not_found",
  );
  refused(
    "an unknown appointment is refused",
    await cancel(patient, randomUUID()),
    "appointment_not_found",
  );

  const byPatient = await cancel(patient, mine, `  ${"y".repeat(600)}  `);
  succeeded("the patient cancels", byPatient);
  const row = await appointmentRow(mine);
  check(
    "it records who, when and why",
    row.status === "cancelled" &&
      row.cancelled_by === "patient" &&
      row.cancelled_at !== null &&
      row.cancellation_reason?.length === 500,
  );
  check(
    "the app gets the doctor's address for the email",
    byPatient.data?.[0]?.cancel_appointment?.doctor_email === doctor.email,
  );
  refused(
    "it can't be cancelled twice",
    await cancel(patient, mine),
    "not_cancellable",
  );

  const byDoctor = await createAppointment(doctor, patient, { from: 120 });
  succeeded("the doctor cancels", await cancel(doctor, byDoctor, "   "));
  const doctorRowAfter = await appointmentRow(byDoctor);
  check(
    "it records the doctor, and a blank reason stays empty",
    doctorRowAfter.cancelled_by === "doctor" &&
      doctorRowAfter.cancellation_reason === null,
  );

  const started = await startedVisit(doctor, patient);
  refused(
    "a started visit can't be cancelled",
    await cancel(patient, started),
    "already_started",
  );

  const completed = await createAppointment(doctor, patient, {
    from: 240,
    status: "completed",
  });
  refused(
    "a completed visit can't be cancelled",
    await cancel(patient, completed),
    "not_cancellable",
  );
}

async function testOutcome({ patient, secondPatient }) {
  section("Outcomes (APT-03)");

  const doctor = await createDoctor();
  const otherDoctor = await createDoctor();
  const setOutcome = (caller, id, status) =>
    rpc(caller, "set_appointment_outcome", {
      p_appointment_id: id,
      p_status: status,
    });

  const visit = await startedVisit(doctor, patient);
  denied(
    "a guest can't set an outcome",
    await setOutcome(null, visit, "completed"),
  );
  refused(
    "the patient can't set an outcome",
    await setOutcome(patient, visit, "completed"),
    "appointment_not_found",
  );
  refused(
    "another doctor can't set an outcome",
    await setOutcome(otherDoctor, visit, "completed"),
    "appointment_not_found",
  );
  refused(
    "an unknown outcome is refused",
    await setOutcome(doctor, visit, "cancelled"),
    "invalid_status",
  );
  refused(
    "a third user can't set an outcome",
    await setOutcome(secondPatient, visit, "no_show"),
    "appointment_not_found",
  );

  succeeded(
    "the doctor marks it completed",
    await setOutcome(doctor, visit, "completed"),
  );
  check(
    "the outcome is saved",
    (await appointmentRow(visit)).status === "completed",
  );
  refused(
    "an outcome can't be set twice",
    await setOutcome(doctor, visit, "no_show"),
    "not_open",
  );

  const upcoming = await createAppointment(doctor, patient, { from: 120 });
  refused(
    "a visit that hasn't started has no outcome",
    await setOutcome(doctor, upcoming, "completed"),
    "not_started",
  );

  const missed = await createAppointment(doctor, patient, {
    from: -120,
    to: -90,
  });
  succeeded(
    "the doctor marks a no-show",
    await setOutcome(doctor, missed, "no_show"),
  );

  const prescribed = await createAppointment(doctor, patient, {
    from: -240,
    to: -210,
  });
  succeeded("a prescription is issued", await issue(doctor, prescribed));
  refused(
    "a prescribed patient can't be a no-show",
    await setOutcome(doctor, prescribed, "no_show"),
    "has_prescription",
  );
  succeeded(
    "a prescribed patient can be completed",
    await setOutcome(doctor, prescribed, "completed"),
  );
}

async function testSchedule({ patient }) {
  section("Saving a schedule (APT-01)");

  const doctor = await createDoctor();
  const profileless = await createUser("doctor");
  const ranges = [
    { weekday: 1, start: "09:00", end: "13:00" },
    { weekday: 1, start: "14:00", end: "17:00" },
    { weekday: 3, start: "10:00", end: "12:00" },
  ];
  const save = (caller, fields = {}) =>
    rpc(caller, "save_doctor_schedule", {
      p_ranges: ranges,
      p_slot_minutes: 20,
      p_accepting: true,
      p_fee: 3000,
      ...fields,
    });

  denied("a guest can't save a schedule", await save(null));
  refused("a patient can't save one", await save(patient), "not_doctor");
  refused(
    "a doctor without a profile can't save one",
    await save(profileless),
    "not_doctor",
  );

  const before = await hoursOf(doctor.id);
  refused(
    "a schedule must be a list",
    await save(doctor, { p_ranges: { weekday: 1 } }),
    "invalid_schedule",
  );
  refused(
    "a schedule can't be huge",
    await save(doctor, {
      p_ranges: Array.from({ length: 29 }, (_, index) => ({
        weekday: index % 7,
        start: "09:00",
        end: "10:00",
      })),
    }),
    "invalid_schedule",
  );
  refused(
    "overlapping hours are refused",
    await save(doctor, {
      p_ranges: [
        { weekday: 2, start: "09:00", end: "12:00" },
        { weekday: 2, start: "11:00", end: "14:00" },
      ],
    }),
    "overlapping_hours",
  );
  check(
    "a refused schedule changes nothing",
    (await hoursOf(doctor.id)).length === before.length,
  );

  const backwards = await save(doctor, {
    p_ranges: [{ weekday: 2, start: "12:00", end: "09:00" }],
  });
  check("hours that end before they start fail", Boolean(backwards.error));
  const badSlot = await save(doctor, { p_slot_minutes: 7 });
  check("a slot length outside the list fails", Boolean(badSlot.error));
  check(
    "those failures change nothing either",
    (await hoursOf(doctor.id)).length === before.length,
  );

  const booked = await createAppointment(doctor, patient, {
    from: 2 * 24 * 60,
  });
  succeeded("a doctor saves their hours", await save(doctor));
  const saved = await hoursOf(doctor.id);
  const profile = await doctorRow(doctor.id);
  check("the new hours replace the old", saved.length === ranges.length);
  check(
    "the settings are saved",
    profile.slot_minutes === 20 &&
      profile.consultation_fee === 3000 &&
      profile.accepting_appointments === true,
  );
  check(
    "existing bookings stay when hours change",
    (await appointmentRow(booked)).status === "booked",
  );

  succeeded(
    "a doctor can clear their week and stop taking bookings",
    await save(doctor, { p_ranges: [], p_accepting: false }),
  );
  check("no hours are left", (await hoursOf(doctor.id)).length === 0);

  denied(
    "a doctor can't write hours directly",
    await as(
      doctor,
      `insert into public.doctor_availability (doctor_id, weekday, start_time, end_time)
       values ($1, 1, '09:00', '10:00')`,
      [doctor.id],
    ),
  );
  check(
    "anyone can read weekly hours",
    (await as(null, `select 1 from public.doctor_availability limit 1`))
      .error === null,
  );
}

async function testCalls({ patient, secondPatient }) {
  section("Call window (CALL-01, FIX-09)");

  const doctor = await createDoctor();
  const cases = [
    { label: "60-minute slot, 50 minutes in", from: -50, to: 10, open: true },
    { label: "ended 20 minutes ago", from: -60, to: -20, open: false },
    { label: "10-minute slot, 25 minutes in", from: -25, to: -15, open: true },
    { label: "starts in 3 minutes", from: 3, to: 33, open: true },
    { label: "starts in 10 minutes", from: 10, to: 40, open: false },
  ];

  for (const { label, from, to, open } of cases) {
    const id = await createAppointment(doctor, patient, { from, to });
    const topic = { p_topic: `call:${id}` };
    const joined = await rpc(patient, "can_join_call", topic);
    check(
      label,
      joined.data?.[0]?.can_join_call === open,
      `got ${joined.data?.[0]?.can_join_call}`,
    );
    if (open) {
      const outsider = await rpc(secondPatient, "can_join_call", topic);
      check(
        `${label}: a third user can't join`,
        outsider.data?.[0]?.can_join_call === false,
      );
    }
    await db.query(`delete from public.appointments where id = $1`, [id]);
  }

  check(
    "a malformed topic is refused",
    (await rpc(patient, "can_join_call", { p_topic: "call:nope" })).data?.[0]
      ?.can_join_call === false,
  );
  denied(
    "a guest can't check a call",
    await rpc(null, "can_join_call", { p_topic: `call:${randomUUID()}` }),
  );

  section("Call events and signaling (CALL-02)");

  const live = await createAppointment(doctor, patient, { from: -5, to: 25 });
  const record = (caller, id, event) =>
    rpc(caller, "record_call_event", {
      p_appointment_id: id,
      p_event: event,
    });

  refused(
    "an unknown event is refused",
    await record(patient, live, "paused"),
    "invalid_event",
  );
  refused(
    "a third user can't start the call",
    await record(secondPatient, live, "started"),
    "call_not_open",
  );
  succeeded(
    "a participant starts the call",
    await record(patient, live, "started"),
  );
  const firstStart = (await appointmentRow(live)).call_started_at;
  check("the start time is recorded", firstStart !== null);
  await record(doctor, live, "started");
  check(
    "a second start keeps the first time",
    (await appointmentRow(live)).call_started_at.getTime() ===
      firstStart.getTime(),
  );
  refused(
    "a third user can't end it",
    await record(secondPatient, live, "ended"),
    "call_not_open",
  );
  succeeded("a participant ends the call", await record(doctor, live, "ended"));
  check(
    "the end time is recorded",
    (await appointmentRow(live)).call_ended_at !== null,
  );

  const signal = async (caller, topic) => {
    await db.query(`select set_config('realtime.topic', $1, false)`, [topic]);
    const result = await as(
      caller,
      `insert into realtime.messages (topic, extension) values ($1, 'broadcast')`,
      [topic],
    );
    await db.query(`select set_config('realtime.topic', '', false)`);
    return result;
  };
  const topic = `call:${live}`;
  succeeded("a participant can send a signal", await signal(patient, topic));
  denied(
    "a third user can't send a signal",
    await signal(secondPatient, topic),
  );
}

async function testPrescriptions({ patient, secondPatient }) {
  section("Issuing prescriptions (RX-01)");

  const doctor = await createDoctor();
  const otherDoctor = await createDoctor();
  const visit = await startedVisit(doctor, patient);

  denied("a guest can't prescribe", await issue(null, visit));
  refused(
    "a patient can't prescribe",
    await issue(patient, visit),
    "not_doctor",
  );
  refused(
    "another doctor can't prescribe",
    await issue(otherDoctor, visit),
    "appointment_not_found",
  );
  refused(
    "an unknown appointment is refused",
    await issue(doctor, randomUUID()),
    "appointment_not_found",
  );

  const upcoming = await createAppointment(doctor, patient, { from: 120 });
  refused(
    "a visit that hasn't started can't be prescribed for",
    await issue(doctor, upcoming),
    "prescribe_not_started",
  );
  const cancelled = await createAppointment(doctor, patient, {
    from: -300,
    to: -270,
    status: "cancelled",
  });
  refused(
    "a cancelled visit can't be prescribed for",
    await issue(doctor, cancelled),
    "appointment_cancelled",
  );
  const noShow = await createAppointment(doctor, patient, {
    from: -400,
    to: -370,
    status: "no_show",
  });
  refused(
    "a no-show can't be prescribed for",
    await issue(doctor, noShow),
    "appointment_no_show",
  );
  const old = await createAppointment(doctor, patient, {
    from: -15 * 24 * 60,
    to: -15 * 24 * 60 + 30,
  });
  refused(
    "the prescribing window closes after 14 days",
    await issue(doctor, old),
    "prescribe_window_closed",
  );

  const invalid = {
    "an empty list": [],
    "more than 20 medicines": Array.from({ length: 21 }, () => medicine()),
    "an unknown form": [medicine({ form: "potion" })],
    "an unknown frequency": [medicine({ frequency: "hourly" })],
    "a daily medicine with no time of day": [medicine({ dose_times: [] })],
    "a nameless medicine": [medicine({ medicine: "   " })],
    "a duration that isn't a number": [medicine({ duration_days: "soon" })],
    "a duration out of range": [medicine({ duration_days: 9999 })],
  };
  for (const [label, items] of Object.entries(invalid)) {
    refused(
      `${label} is refused`,
      await issue(doctor, visit, { p_items: items }),
      "invalid_prescription",
    );
  }
  refused(
    "a list is required",
    await issue(doctor, visit, { p_items: { medicine: "x" } }),
    "invalid_prescription",
  );
  refused(
    "an overlong diagnosis is refused",
    await issue(doctor, visit, { p_diagnosis: "d".repeat(201) }),
    "invalid_prescription",
  );

  refused(
    "a replaced id with nothing active is refused",
    await issue(doctor, visit, { p_replaces_id: randomUUID() }),
    "prescription_changed",
  );

  const first = await issue(doctor, visit, {
    p_diagnosis: "  Sore throat  ",
    p_items: [
      medicine({ dose_times: ["night", "noon", "morning"] }),
      medicine({
        medicine: "Paracetamol",
        form: "tablet",
        frequency: "as_needed",
        dose_times: ["morning"],
      }),
    ],
  });
  succeeded("the doctor prescribes", first);
  const firstId = issued(first)?.id;
  check(
    "the prescription snapshots names for later",
    issued(first)?.doctor_name === "Dr. Sql Doctor" &&
      issued(first)?.doctor_license === TAG &&
      issued(first)?.diagnosis === "Sore throat",
  );
  check("it's a new prescription", issued(first)?.replaced === false);

  const { rows: items } = await db.query(
    `select medicine, dose_times from public.prescription_items
     where prescription_id = $1 order by sort_order`,
    [firstId],
  );
  check(
    "times keep only known values, once, in day order",
    items[0]?.dose_times.join() === "morning,night",
  );
  check("as-needed medicines have no times", items[1]?.dose_times.length === 0);

  refused(
    "editing needs the active version",
    await issue(doctor, visit),
    "prescription_changed",
  );
  refused(
    "a stale version is refused",
    await issue(doctor, visit, { p_replaces_id: randomUUID() }),
    "prescription_changed",
  );

  const second = await issue(doctor, visit, { p_replaces_id: firstId });
  succeeded("an edit issues a new version", second);
  const secondId = issued(second)?.id;
  check("it says it replaced one", issued(second)?.replaced === true);
  check("it points at the old one", issued(second)?.replaces_id === firstId);

  const statusOf = async (id) =>
    (
      await db.query(`select status from public.prescriptions where id = $1`, [
        id,
      ])
    ).rows[0]?.status;
  check(
    "the old version is marked replaced",
    (await statusOf(firstId)) === "replaced",
  );

  const twoActive = await db
    .query(`update public.prescriptions set status = 'active' where id = $1`, [
      firstId,
    ])
    .catch((error) => ({ error }));
  check(
    "two active versions are impossible",
    twoActive.error?.code === "23505",
  );

  section("Cancelling prescriptions (RX-01)");

  const cancelRx = (caller, id, reason) =>
    rpc(caller, "cancel_prescription", {
      p_prescription_id: id,
      p_reason: reason,
    });

  denied("a guest can't cancel one", await cancelRx(null, secondId, TAG));
  refused(
    "a patient can't cancel one",
    await cancelRx(patient, secondId, TAG),
    "prescription_not_found",
  );
  refused(
    "another doctor can't cancel one",
    await cancelRx(otherDoctor, secondId, TAG),
    "prescription_not_found",
  );
  refused(
    "a reason is required",
    await cancelRx(doctor, secondId, "   "),
    "reason_required",
  );
  refused(
    "a replaced version can't be cancelled",
    await cancelRx(doctor, firstId, TAG),
    "prescription_not_active",
  );

  const cancelledRx = await cancelRx(doctor, secondId, ` ${TAG} `);
  succeeded("the doctor cancels with a reason", cancelledRx);
  check(
    "the app gets the patient's address for the email",
    cancelledRx.data?.[0]?.cancel_prescription?.patient_email === patient.email,
  );
  check(
    "the reason is kept",
    cancelledRx.data?.[0]?.cancel_prescription?.cancellation_reason === TAG,
  );
  refused(
    "it can't be cancelled twice",
    await cancelRx(doctor, secondId, TAG),
    "prescription_not_active",
  );
  succeeded("a new one can follow a cancellation", await issue(doctor, visit));

  section("Who can read clinical data (PRV-03, SEC-01)");

  const seen = (rows) => rows.data?.length ?? 0;
  const prescriptions = `select id from public.prescriptions where appointment_id = '${visit}'`;
  const rxItems = `select i.id from public.prescription_items i
    join public.prescriptions p on p.id = i.prescription_id
    where p.appointment_id = '${visit}'`;

  check(
    "the patient reads their prescriptions",
    seen(await as(patient, prescriptions)) === 3,
  );
  check("the doctor reads theirs", seen(await as(doctor, prescriptions)) === 3);
  check(
    "a third user reads nothing",
    seen(await as(secondPatient, prescriptions)) === 0,
  );
  check(
    "another doctor reads nothing",
    seen(await as(otherDoctor, prescriptions)) === 0,
  );
  check(
    "the patient reads the medicines",
    seen(await as(patient, rxItems)) > 0,
  );
  check(
    "a third user reads no medicines",
    seen(await as(secondPatient, rxItems)) === 0,
  );
  denied(
    "guests read no prescriptions",
    await as(null, `select id from public.prescriptions`),
  );
  denied(
    "doctors can't change a prescription directly",
    await as(
      doctor,
      `update public.prescriptions set diagnosis = 'x' where appointment_id = '${visit}'`,
    ),
  );
  denied(
    "patients can't change a prescription directly",
    await as(
      patient,
      `delete from public.prescription_items where prescription_id = '${firstId}'`,
    ),
  );

  const appointment = `select id from public.appointments where id = '${visit}'`;
  check(
    "the patient reads the visit",
    seen(await as(patient, appointment)) === 1,
  );
  check("a third user can't", seen(await as(secondPatient, appointment)) === 0);

  section("Private notes (APT-03)");

  const saveNote = (caller, appointmentId, doctorId) =>
    as(
      caller,
      `insert into public.appointment_notes (appointment_id, doctor_id, notes)
       values ($1, $2, 'private') on conflict (appointment_id) do update set notes = 'edited'`,
      [appointmentId, doctorId],
    );

  succeeded(
    "the doctor writes a note",
    await saveNote(doctor, visit, doctor.id),
  );
  succeeded("and edits it", await saveNote(doctor, visit, doctor.id));
  check(
    "the patient can't read it",
    seen(await as(patient, `select notes from public.appointment_notes`)) === 0,
  );
  const stray = await saveNote(otherDoctor, visit, otherDoctor.id);
  denied("another doctor can't attach a note to it", stray);
}

async function testVisitSummaries({ patient, secondPatient }) {
  section("Visit summaries (REC-01)");

  const doctor = await createDoctor();
  const otherDoctor = await createDoctor();
  const visit = await startedVisit(doctor, patient);
  const save = (caller, appointmentId, fields = {}) =>
    rpc(caller, "save_visit_summary", {
      p_appointment_id: appointmentId,
      p_diagnosis: "Viral fever",
      ...fields,
    });
  const summaryOf = async (appointmentId) =>
    (
      await db.query(
        `select *, follow_up_on::text as follow_up from public.visit_summaries
         where appointment_id = $1`,
        [appointmentId],
      )
    ).rows[0];
  const kinds = async (userId) =>
    (
      await db.query(
        `select kind from public.notifications
         where user_id = $1 and kind like 'visit_summary%' order by created_at, id`,
        [userId],
      )
    ).rows.map((row) => row.kind);
  const audits = async (appointmentId) =>
    (
      await db.query(
        `select action, actor_id from public.audit_log
         where target_id = $1 and action like 'visit_summary%' order by id`,
        [appointmentId],
      )
    ).rows;

  denied("a guest can't write a summary", await save(null, visit));
  refused(
    "a patient can't write a summary",
    await save(patient, visit),
    "not_doctor",
  );
  refused(
    "another doctor can't write one",
    await save(otherDoctor, visit),
    "appointment_not_found",
  );
  refused(
    "an unknown appointment is refused",
    await save(doctor, randomUUID()),
    "appointment_not_found",
  );
  refused(
    "a visit that hasn't started can't have one",
    await save(doctor, await createAppointment(doctor, patient, { from: 120 })),
    "summary_not_started",
  );
  refused(
    "a cancelled visit can't have one",
    await save(
      doctor,
      await createAppointment(doctor, patient, {
        from: -300,
        to: -270,
        status: "cancelled",
      }),
    ),
    "appointment_cancelled",
  );
  refused(
    "a no-show can't have one",
    await save(
      doctor,
      await createAppointment(doctor, patient, {
        from: -400,
        to: -370,
        status: "no_show",
      }),
    ),
    "appointment_no_show",
  );
  refused(
    "the window closes 14 days after the visit",
    await save(
      doctor,
      await createAppointment(doctor, patient, {
        from: -15 * 24 * 60,
        to: -15 * 24 * 60 + 30,
      }),
    ),
    "summary_window_closed",
  );

  const visitDay = (
    await db.query(
      `select (starts_at at time zone timezone)::date::text as day
       from public.appointments where id = $1`,
      [visit],
    )
  ).rows[0].day;
  const addDays = (days) =>
    new Date(Date.parse(visitDay) + days * DAY).toISOString().slice(0, 10);
  const invalid = {
    "a summary with nothing in it": { p_diagnosis: "   ", p_advice: " " },
    "an overlong diagnosis": { p_diagnosis: "d".repeat(201) },
    "overlong advice": { p_advice: "a".repeat(2001) },
    "a follow-up on the visit day": { p_follow_up_on: visitDay },
    "a follow-up more than a year out": { p_follow_up_on: addDays(366) },
  };
  for (const [label, fields] of Object.entries(invalid)) {
    refused(
      `${label} is refused`,
      await save(doctor, visit, fields),
      "invalid_summary",
    );
  }
  check("nothing was saved by refusals", !(await summaryOf(visit)));

  succeeded(
    "the doctor writes a summary",
    await save(doctor, visit, {
      p_diagnosis: "  Viral fever  ",
      p_advice: "Rest and fluids.",
      p_follow_up_on: addDays(7),
    }),
  );
  const saved = await summaryOf(visit);
  const { rows: appointmentRows } = await db.query(
    `select care_recipient_id from public.appointments where id = $1`,
    [visit],
  );
  check(
    "blanks are trimmed and the visit's person is named",
    saved?.diagnosis === "Viral fever" &&
      saved?.advice === "Rest and fluids." &&
      saved?.care_recipient_id === appointmentRows[0].care_recipient_id &&
      saved?.follow_up === addDays(7) &&
      saved?.patient_id === patient.id,
  );
  check(
    "the patient is told it's ready",
    (await kinds(patient.id)).join() === "visit_summary_ready",
  );

  succeeded(
    "saving the same summary again works",
    await save(doctor, visit, {
      p_diagnosis: "Viral fever",
      p_advice: "Rest and fluids.",
      p_follow_up_on: addDays(7),
    }),
  );
  check(
    "but tells nobody",
    (await kinds(patient.id)).length === 1 &&
      (await audits(visit)).length === 1,
  );

  succeeded(
    "the doctor edits it, down to a follow-up date alone",
    await save(doctor, visit, {
      p_diagnosis: null,
      p_advice: "",
      p_follow_up_on: addDays(365),
    }),
  );
  const edited = await summaryOf(visit);
  check(
    "the edit replaces every field",
    edited?.diagnosis === null &&
      edited?.advice === null &&
      edited?.follow_up === addDays(365),
  );
  check(
    "the patient is told it changed",
    (await kinds(patient.id)).join() ===
      "visit_summary_ready,visit_summary_updated",
  );
  const trail = await audits(visit);
  check(
    "the audit log has both, by the doctor",
    trail.map((row) => row.action).join() ===
      "visit_summary.written,visit_summary.edited" &&
      trail.every((row) => row.actor_id === doctor.id),
  );

  const read = async (caller) =>
    (await as(caller, `select appointment_id from public.visit_summaries`)).data
      ?.length ?? 0;
  check("the patient reads their summary", (await read(patient)) === 1);
  check("the doctor reads it", (await read(doctor)) === 1);
  check("another patient reads nothing", (await read(secondPatient)) === 0);
  check("another doctor reads nothing", (await read(otherDoctor)) === 0);
  check(
    "a doctor with only a password reads nothing",
    (await read({ ...doctor, aal: "aal1" })) === 0,
  );
  refused(
    "a doctor with only a password can't write one",
    {
      ...(await save({ ...doctor, aal: "aal1" }, visit)),
      fn: "require_second_factor",
    },
    "second_factor_required",
  );
  denied(
    "nobody writes the table directly",
    await as(
      doctor,
      `update public.visit_summaries set diagnosis = 'x' where appointment_id = $1`,
      [visit],
    ),
  );
}

async function testPatientDocuments({ patient, secondPatient }) {
  section("Patient documents (REC-02)");

  const doctor = await createDoctor();
  await startedVisit(doctor, patient);
  // A file the server has checked and moved out of incoming/.
  const storedFile = async (owner, extension = "pdf", folder = "") => {
    const path = `${owner.id}/${folder}${randomUUID()}.${extension}`;
    await db.query(
      `insert into storage.objects (bucket_id, name, metadata)
       values ('patient-documents', $1, $2)`,
      [path, { size: 2048 }],
    );
    return path;
  };
  const add = (caller, path, fields = {}) =>
    rpc(caller, "add_patient_document", {
      p_path: path,
      p_kind: "lab_report",
      p_title: "  Blood test  ",
      ...fields,
    });
  const remove = (caller, id) =>
    rpc(caller, "delete_patient_document", { p_document_id: id });
  const audits = async (documentId) =>
    (
      await db.query(
        `select action, actor_id from public.audit_log
         where target_id = $1 and action like 'patient_document%' order by id`,
        [documentId],
      )
    ).rows;

  const path = await storedFile(patient);
  denied("a guest can't add a document", await add(null, path));
  refused("a doctor can't add one", await add(doctor, path), "not_patient");
  refused(
    "a patient can't add a file in another account's folder",
    await add(secondPatient, path),
    "invalid_path",
  );
  refused(
    "a file still in incoming/ can't be recorded",
    await add(patient, await storedFile(patient, "pdf", "incoming/")),
    "invalid_path",
  );
  refused(
    "a path with another extension is refused",
    await add(patient, await storedFile(patient, "html")),
    "invalid_path",
  );
  refused(
    "a path with no file behind it is refused",
    await add(patient, `${patient.id}/${randomUUID()}.pdf`),
    "file_not_found",
  );
  for (const [label, fields] of [
    ["an unknown kind", { p_kind: "selfie" }],
    ["a blank title", { p_title: "   " }],
    ["a title over 120 characters", { p_title: "x".repeat(121) }],
    ["a date in the future", { p_document_on: "2999-01-01" }],
    ["a date before 1900", { p_document_on: "1899-12-31" }],
  ]) {
    refused(
      `${label} is refused`,
      await add(patient, path, fields),
      "invalid_document",
    );
  }

  const dependent = (
    await db.query(
      `insert into public.care_recipients (account_id, relation, first_name, last_name)
       values ($1, 'child', 'Other', 'Child') returning id`,
      [secondPatient.id],
    )
  ).rows[0].id;
  refused(
    "a patient can't file a document under another account's dependent",
    await add(patient, path, { p_care_recipient_id: dependent }),
    "care_recipient_not_found",
  );

  const added = await add(patient, path, { p_document_on: "2026-10-05" });
  succeeded("a patient adds a checked file", added);
  const documentId = added.data?.[0]?.add_patient_document;
  const row = (
    await db.query(
      `select d.*, d.document_on::text as dated, c.relation
       from public.patient_documents d
       join public.care_recipients c on c.id = d.care_recipient_id
       where d.id = $1`,
      [documentId],
    )
  ).rows[0];
  check(
    "it's filed under the patient themself, trimmed, with its type and size",
    row?.relation === "self" &&
      row.title === "Blood test" &&
      row.dated === "2026-10-05" &&
      row.content_type === "application/pdf" &&
      Number(row.size_bytes) === 2048,
  );
  refused(
    "the same file can't be recorded twice",
    await add(patient, path),
    "document_exists",
  );
  succeeded(
    "a photo is recorded as an image",
    await add(patient, await storedFile(patient, "jpg"), { p_kind: "imaging" }),
  );

  const read = async (caller) =>
    (await as(caller, `select id from public.patient_documents`)).data
      ?.length ?? 0;
  check("the patient reads their documents", (await read(patient)) === 2);
  check("another patient reads nothing", (await read(secondPatient)) === 0);
  check(
    "their doctor reads nothing until sharing exists",
    (await read(doctor)) === 0,
  );
  denied(
    "nobody writes the table directly",
    await as(
      patient,
      `update public.patient_documents set title = 'x' where id = $1`,
      [documentId],
    ),
  );

  const paired = await createPatient();
  await db.query(
    `insert into auth.mfa_factors (user_id, status) values ($1, 'verified')`,
    [paired.id],
  );
  refused(
    "a patient who paired an app needs it to add a document",
    {
      ...(await add(paired, await storedFile(paired))),
      fn: "require_second_factor",
    },
    "second_factor_required",
  );
  succeeded(
    "with the app they can",
    await add({ ...paired, aal: "aal2" }, await storedFile(paired)),
  );
  check(
    "and with only a password they read nothing",
    (await read(paired)) === 0 &&
      (await read({ ...paired, aal: "aal2" })) === 1,
  );

  await db.query(
    `insert into public.patient_documents
       (patient_id, care_recipient_id, kind, title, storage_path, content_type)
     select c.account_id, c.id, 'other', 'Filler', c.account_id || '/filler-' || n || '.pdf',
       'application/pdf'
     from public.care_recipients c, generate_series(1, 498) n
     where c.account_id = $1::uuid and c.relation = 'self'`,
    [patient.id],
  );
  refused(
    "an account holds at most 500 documents",
    await add(patient, await storedFile(patient)),
    "document_limit",
  );
  await db.query(
    `delete from public.patient_documents where patient_id = $1 and title = 'Filler'`,
    [patient.id],
  );

  refused(
    "another patient can't delete it",
    await remove(secondPatient, documentId),
    "document_not_found",
  );
  refused(
    "a doctor can't delete it",
    await remove(doctor, documentId),
    "not_patient",
  );
  const deleted = await remove(patient, documentId);
  check(
    "the patient deletes it and gets the file's path back",
    deleted.data?.[0]?.delete_patient_document === path,
    deleted.error?.message ?? "",
  );
  check(
    "adding and deleting are audited, by the patient, ids only",
    (await audits(documentId))
      .map((entry) => `${entry.action}:${entry.actor_id === patient.id}`)
      .join() === "patient_document.added:true,patient_document.deleted:true",
  );
}

// A doctor's file at the path the app makes, recorded as checked the way the
// server does after verifyUpload passes it.
async function checkedDoctorFile(doctorId, kind, extension = "pdf") {
  const path = `${doctorId}/${kind}-${randomUUID()}.${extension}`;
  await rpc({ role: "service_role" }, "mark_upload_checked", {
    p_bucket: "doctor-documents",
    p_path: path,
    p_owner_id: doctorId,
  });
  return path;
}

// The submission an admin's page showed, as PostgREST would send it.
const doctorSubmittedAt = async (doctorId) =>
  (
    await db.query(
      `select submitted_at::text as at from public.doctor_profiles where id = $1`,
      [doctorId],
    )
  ).rows[0]?.at ?? null;

async function testVerification({ patient }) {
  section("Doctors send documents (FIX-07, ADM-02)");

  const doctor = await createDoctor({ status: "pending" });
  const save = (caller, paths) =>
    rpc(caller, "save_verification_documents", paths);
  const licensePath = await checkedDoctorFile(doctor.id, "license");

  succeeded(
    "a doctor saves a checked document",
    await save(doctor, { p_license_path: licensePath }),
  );
  const savedRow = await doctorRow(doctor.id);
  check(
    "it's stored with the submission time",
    savedRow.license_document_path === licensePath &&
      savedRow.submitted_at !== null,
  );
  refused(
    "a checked file is taken once",
    await save(doctor, { p_license_path: licensePath }),
    "upload_not_checked",
  );
  refused(
    "a file the server didn't check is refused",
    await save(doctor, {
      p_license_path: `${doctor.id}/license-${randomUUID()}.pdf`,
    }),
    "upload_not_checked",
  );
  const photo = await checkedDoctorFile(doctor.id, "photo", "png");
  const unchecked = `${doctor.id}/degree-${randomUUID()}.pdf`;
  refused(
    "one unchecked file refuses the whole save",
    await save(doctor, { p_photo_path: photo, p_degree_path: unchecked }),
    "upload_not_checked",
  );
  check(
    "and nothing changed",
    (await doctorRow(doctor.id)).photo_path === savedRow.photo_path,
  );
  for (const [label, paths] of [
    [
      "a path the app didn't make",
      { p_license_path: `${doctor.id}/license.pdf` },
    ],
    [
      "a type the kind doesn't take",
      { p_degree_path: `${doctor.id}/degree-${randomUUID()}.png` },
    ],
    [
      "a file of another kind",
      { p_photo_path: `${doctor.id}/license-${randomUUID()}.jpg` },
    ],
  ]) {
    refused(`${label} is refused`, await save(doctor, paths), "invalid_path");
  }
  refused(
    "a patient can't use it",
    await save(patient, { p_license_path: licensePath }),
    "not_doctor",
  );
  denied(
    "a guest can't use it",
    await save(null, { p_license_path: licensePath }),
  );
  refused(
    "a doctor account with no profile is refused",
    await save(await createUser("doctor"), { p_license_path: licensePath }),
    "doctor_not_found",
  );
  refused(
    "a path in someone else's folder is refused",
    await save(doctor, {
      p_license_path: `${randomUUID()}/license-${randomUUID()}.pdf`,
    }),
    "invalid_path",
  );
  denied(
    "a doctor can't approve themself",
    await as(
      doctor,
      `update public.doctor_profiles set verification_status = 'approved' where id = $1`,
      [doctor.id],
    ),
  );
  check(
    "the status didn't change",
    (await doctorRow(doctor.id)).verification_status === "pending",
  );

  const asked = await createDoctor({ status: "needs_info" });
  await db.query(
    `update public.doctor_profiles set verification_note = $1 where id = $2`,
    [TAG, asked.id],
  );
  succeeded(
    "new documents answer a request",
    await save(asked, {
      p_degree_path: await checkedDoctorFile(asked.id, "degree"),
    }),
  );
  const answered = await doctorRow(asked.id);
  check(
    "the doctor goes back in the queue, note cleared",
    answered.verification_status === "pending" &&
      answered.verification_note === null,
  );

  for (const status of ["approved", "rejected"]) {
    const closed = await createDoctor({ status });
    refused(
      `${status} doctors can't replace their files`,
      await save(closed, { p_license_path: `${closed.id}/license.pdf` }),
      "verification_closed",
    );
  }
}

async function testReview({ patient }) {
  section("Admins review doctors (ADM-01, ADM-02)");

  const adminUser = await createUser("admin");
  const verified = { ...adminUser, aal: "aal2" };
  const passwordOnly = { ...adminUser, aal: "aal1" };
  const doctor = await createDoctor({ status: "pending", documents: true });
  const review = async (caller, doctorId, decision, note, seen) =>
    rpc(caller, "admin_review_doctor", {
      p_doctor_id: doctorId,
      p_decision: decision,
      p_submitted_at:
        seen === undefined ? await doctorSubmittedAt(doctorId) : seen,
      p_note: note,
    });

  refused(
    "a patient can't review",
    await review(patient, doctor.id, "approved"),
    "not_admin",
  );
  refused(
    "a doctor can't approve themself",
    await review(doctor, doctor.id, "approved"),
    "not_admin",
  );
  refused(
    "an admin without two-factor can't review",
    await review(passwordOnly, doctor.id, "approved"),
    "not_admin",
  );
  refused(
    "the secret key alone can't review",
    await review({ role: "service_role" }, doctor.id, "approved"),
    "not_admin",
  );
  denied("a guest can't review", await review(null, doctor.id, "approved"));

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
    "an unknown doctor is refused",
    await review(verified, randomUUID(), "approved"),
    "doctor_not_found",
  );
  refused(
    "approval needs all three documents",
    await review(
      verified,
      (await createDoctor({ status: "pending" })).id,
      "approved",
    ),
    "documents_missing",
  );
  refused(
    "approval needs a confirmed email",
    await review(
      verified,
      (
        await createDoctor({
          status: "pending",
          confirmed: false,
          documents: true,
        })
      ).id,
      "approved",
    ),
    "email_not_confirmed",
  );

  const resent = await createDoctor({ status: "pending", documents: true });
  await rpc(resent, "save_verification_documents", {
    p_degree_path: await checkedDoctorFile(resent.id, "degree"),
  });
  const seenFirst = await doctorSubmittedAt(resent.id);
  await rpc(resent, "save_verification_documents", {
    p_license_path: await checkedDoctorFile(resent.id, "license"),
  });
  refused(
    "a decision on documents the doctor has since changed is refused",
    await review(verified, resent.id, "approved", undefined, seenFirst),
    "details_changed",
  );
  succeeded(
    "a decision on the latest documents goes through",
    await review(verified, resent.id, "approved"),
  );

  check("before approval they aren't listed", !(await isListed(doctor.id)));
  const approval = await review(verified, doctor.id, "approved");
  check(
    "an admin approves",
    approval.data?.[0]?.admin_review_doctor === doctor.email,
  );
  check("after approval they're listed", await isListed(doctor.id));
  refused(
    "a doctor can't be reviewed twice",
    await review(verified, doctor.id, "rejected", TAG),
    "already_reviewed",
  );

  section("Admin reads (ADM-02, ADM-05, SEC-04)");

  refused(
    "a doctor can't list the queue",
    await rpc(doctor, "admin_doctor_reviews"),
    "not_admin",
  );
  denied(
    "a guest can't list the queue",
    await rpc(null, "admin_doctor_reviews"),
  );
  const queue = await rpc(verified, "admin_doctor_reviews", {
    p_doctor_id: doctor.id,
  });
  check(
    "an admin reads one doctor, with their email",
    queue.data?.length === 1 && queue.data[0].email === doctor.email,
  );

  const log = await rpc(verified, "admin_audit_log", { p_user_id: doctor.id });
  check(
    "the approval is in the audit log",
    log.data?.some(
      (entry) =>
        entry.action === "doctor.approved" &&
        entry.actor_id === adminUser.id &&
        entry.actor_role === "admin",
    ),
  );
  refused(
    "a doctor can't read the audit log",
    await rpc(doctor, "admin_audit_log"),
    "not_admin",
  );
  refused(
    "an admin without two-factor can't read the audit log",
    await rpc(passwordOnly, "admin_audit_log"),
    "not_admin",
  );

  section("The audit log is append-only (SEC-04)");

  const secretKey = { role: "service_role" };
  denied(
    "signed-in users can't read the table",
    await as(verified, `select id from public.audit_log`),
  );
  denied(
    "the secret key can't update it",
    await as(secretKey, `update public.audit_log set action = 'x'`),
  );
  denied(
    "the secret key can't delete from it",
    await as(secretKey, `delete from public.audit_log`),
  );
  denied(
    "the secret key can't write to it directly",
    await as(secretKey, `insert into public.audit_log (action) values ('x')`),
  );
  denied(
    "nobody calls the audit writer directly",
    await as(verified, `select private.write_audit('x', 'x', null)`),
  );

  section("Document access (ADM-02, SEC-07)");

  await db.query(
    `insert into storage.objects (bucket_id, name) values ('doctor-documents', $1)`,
    [`${doctor.id}/license.pdf`],
  );
  const seenFiles = async (caller) =>
    (await as(caller, `select name from storage.objects`)).data?.length ?? 0;
  check("the doctor sees their own file", (await seenFiles(doctor)) === 1);
  check("an admin with two-factor sees it", (await seenFiles(verified)) === 1);
  check(
    "an admin without two-factor doesn't",
    (await seenFiles(passwordOnly)) === 0,
  );
  check("a patient doesn't", (await seenFiles(patient)) === 0);
}

async function createLab({
  status = "pending",
  confirmed = true,
  license = false,
  authority = license ? "punjab" : null,
} = {}) {
  const user = await createUser("lab", { confirmed });
  await db.query(
    `insert into public.lab_profiles (
       id, lab_name, registration_number, contact_person, phone, address,
       verification_status, licensing_authority, license_document_path
     ) values ($1, 'Sql Lab', 'PHC-1', 'Sql Person', '+92 300 0000000', 'Lahore', $2, $3, $4)`,
    [user.id, status, authority, license ? `${user.id}/license-1.pdf` : null],
  );
  return user;
}

const labRow = async (id) =>
  (await db.query(`select * from public.lab_profiles where id = $1`, [id]))
    .rows[0];

const isLabListed = async (labId) =>
  ((
    await as(null, `select id from public.lab_directory where id = $1`, [labId])
  ).data?.length ?? 0) === 1;

async function testLabVerification({ patient }) {
  section("Labs send their details (ADM-04, AUTH-04)");

  const lab = await createLab();
  const newPath = (labId, extension = "pdf") =>
    `${labId}/license-${randomUUID()}.${extension}`;
  // What the server does after verifyUpload passes a file.
  const markChecked = (caller, path, ownerId) =>
    rpc(caller, "mark_upload_checked", {
      p_bucket: "lab-documents",
      p_path: path,
      p_owner_id: ownerId,
    });
  const checkedLicense = async (labId) => {
    const path = newPath(labId);
    await markChecked({ role: "service_role" }, path, labId);
    return path;
  };
  const details = (fields = {}) => ({
    p_registration_number: "  PHC-2024-77  ",
    p_licensing_authority: "punjab",
    p_address: " 12 Mall Road, Lahore ",
    p_license_path: null,
    ...fields,
  });
  const save = (caller, args) => rpc(caller, "save_lab_verification", args);

  const firstPath = await checkedLicense(lab.id);
  const first = await save(lab, details({ p_license_path: firstPath }));
  check(
    "a lab sends its details and a checked licence; nothing was replaced",
    !first.error && first.data?.[0]?.save_lab_verification === null,
    first.error?.message ?? "",
  );
  const saved = await labRow(lab.id);
  check(
    "the details are stored, trimmed, with the submission time",
    saved.registration_number === "PHC-2024-77" &&
      saved.address === "12 Mall Road, Lahore" &&
      saved.licensing_authority === "punjab" &&
      saved.license_document_path === firstPath &&
      saved.submitted_at !== null,
  );
  refused(
    "a checked file is taken once",
    await save(lab, details({ p_license_path: firstPath })),
    "upload_not_checked",
  );

  const secondPath = await checkedLicense(lab.id);
  const replaced = await save(lab, details({ p_license_path: secondPath }));
  check(
    "a new licence returns the one it replaced, for deleting",
    replaced.data?.[0]?.save_lab_verification === firstPath,
  );
  const kept = await save(lab, details());
  check(
    "details alone keep the licence",
    kept.data?.[0]?.save_lab_verification === null &&
      (await labRow(lab.id)).license_document_path === secondPath,
  );

  refused(
    "a file the server didn't check is refused",
    await save(lab, details({ p_license_path: newPath(lab.id) })),
    "upload_not_checked",
  );
  const otherOwner = newPath(lab.id);
  await markChecked({ role: "service_role" }, otherOwner, patient.id);
  refused(
    "a file checked for someone else is refused",
    await save(lab, details({ p_license_path: otherOwner })),
    "upload_not_checked",
  );
  refused(
    "a path in someone else's folder is refused",
    await save(lab, details({ p_license_path: newPath(randomUUID()) })),
    "invalid_path",
  );
  for (const path of [
    `${lab.id}/license-2.pdf`,
    newPath(lab.id, "html"),
    `${lab.id}/photo-${randomUUID()}.pdf`,
  ]) {
    refused(
      `a path the app didn't make is refused (${path.split("/")[1]})`,
      await save(lab, details({ p_license_path: path })),
      "invalid_path",
    );
  }
  refused(
    "a lab without two-factor is refused",
    await save({ ...lab, aal: "aal1" }, details()),
    "second_factor_required",
  );

  for (const [label, caller] of [
    ["a lab", lab],
    ["a patient", patient],
    ["a guest", null],
  ]) {
    denied(
      `${label} can't mark an upload checked`,
      await markChecked(caller, newPath(lab.id), lab.id),
    );
  }
  await db.query(
    `insert into private.checked_uploads (bucket, path, owner_id, checked_at)
     values ('lab-documents', $1, $2, now() - interval '2 days')`,
    [newPath(lab.id), lab.id],
  );
  await checkedLicense(lab.id);
  check(
    "old checked-upload records are cleared",
    (
      await db.query(
        `select count(*)::int as n from private.checked_uploads
         where owner_id = $1 and checked_at < now() - interval '1 day'`,
        [lab.id],
      )
    ).rows[0].n === 0,
  );

  refused("a patient can't use it", await save(patient, details()), "not_lab");
  denied("a guest can't use it", await save(null, details()));
  const noProfile = await createUser("lab");
  refused(
    "a lab account with no profile is refused",
    await save(noProfile, details()),
    "lab_not_found",
  );
  check(
    "an unknown authority is refused by the table",
    Boolean(
      (await save(lab, details({ p_licensing_authority: "mars" }))).error,
    ),
  );
  check(
    "a blank registration number is refused by the table",
    Boolean((await save(lab, details({ p_registration_number: "   " }))).error),
  );

  for (const column of [
    "verification_status = 'approved'",
    "registration_number = 'X'",
    "address = 'X'",
    "license_document_path = 'x'",
  ]) {
    denied(
      `a lab can't set ${column.split(" ")[0]} itself`,
      await as(lab, `update public.lab_profiles set ${column} where id = $1`, [
        lab.id,
      ]),
    );
  }
  succeeded(
    "a lab still edits its phone",
    await as(
      lab,
      `update public.lab_profiles set phone = '+92 300 1111111' where id = $1`,
      [lab.id],
    ),
  );
  check(
    "the status didn't change",
    (await labRow(lab.id)).verification_status === "pending",
  );

  const asked = await createLab({ status: "needs_info", license: true });
  await db.query(
    `update public.lab_profiles set verification_note = $1 where id = $2`,
    [TAG, asked.id],
  );
  succeeded("new details answer a request", await save(asked, details()));
  const answered = await labRow(asked.id);
  check(
    "the lab goes back in the queue, note cleared",
    answered.verification_status === "pending" &&
      answered.verification_note === null,
  );

  for (const status of ["approved", "rejected"]) {
    const closed = await createLab({ status, license: true });
    refused(
      `${status} labs can't change their details`,
      await save(closed, details()),
      "verification_closed",
    );
  }

  section("Admins review labs (ADM-04)");

  const adminUser = await createUser("admin");
  const verified = { ...adminUser, aal: "aal2" };
  const passwordOnly = { ...adminUser, aal: "aal1" };
  const ready = await createLab({ license: true });
  // The submission the admin's page showed, as PostgREST would send it.
  const submittedAt = async (labId) =>
    (
      await db.query(
        `select submitted_at::text as at from public.lab_profiles where id = $1`,
        [labId],
      )
    ).rows[0]?.at ?? null;
  const review = async (caller, labId, decision, note, seen) =>
    rpc(caller, "admin_review_lab", {
      p_lab_id: labId,
      p_decision: decision,
      p_submitted_at: seen === undefined ? await submittedAt(labId) : seen,
      p_note: note,
    });

  refused(
    "a patient can't review",
    await review(patient, ready.id, "approved"),
    "not_admin",
  );
  refused(
    "a lab can't approve itself",
    await review(ready, ready.id, "approved"),
    "not_admin",
  );
  refused(
    "an admin without two-factor can't review",
    await review(passwordOnly, ready.id, "approved"),
    "not_admin",
  );
  refused(
    "the secret key alone can't review",
    await review({ role: "service_role" }, ready.id, "approved"),
    "not_admin",
  );
  denied("a guest can't review", await review(null, ready.id, "approved"));
  refused(
    "an unknown decision is refused",
    await review(verified, ready.id, "maybe"),
    "invalid_decision",
  );
  refused(
    "asking for information needs a note",
    await review(verified, ready.id, "needs_info", "  "),
    "note_required",
  );
  refused(
    "an unknown lab is refused",
    await review(verified, randomUUID(), "approved"),
    "lab_not_found",
  );
  refused(
    "approval needs the licence",
    await review(verified, (await createLab()).id, "approved"),
    "documents_missing",
  );
  const noAuthority = await createLab({ license: true, authority: null });
  refused(
    "approval needs the licensing authority",
    await review(verified, noAuthority.id, "approved"),
    "documents_missing",
  );
  refused(
    "approval needs a confirmed email",
    await review(
      verified,
      (await createLab({ license: true, confirmed: false })).id,
      "approved",
    ),
    "email_not_confirmed",
  );

  const resent = await createLab();
  await save(
    resent,
    details({ p_license_path: await checkedLicense(resent.id) }),
  );
  const seenFirst = await submittedAt(resent.id);
  await save(resent, details({ p_registration_number: "PHC-NEW" }));
  refused(
    "a decision on details the lab has since changed is refused",
    await review(verified, resent.id, "approved", undefined, seenFirst),
    "details_changed",
  );
  succeeded(
    "a decision on the latest details goes through",
    await review(verified, resent.id, "approved"),
  );

  check("before approval the lab isn't listed", !(await isLabListed(ready.id)));
  const approval = await review(verified, ready.id, "approved");
  check(
    "an admin approves and gets the lab's email",
    approval.data?.[0]?.admin_review_lab === ready.email,
  );
  check("after approval the lab is listed", await isLabListed(ready.id));
  const approved = await labRow(ready.id);
  check(
    "who approved and when are stored",
    approved.verified_by === adminUser.id && approved.verified_at !== null,
  );
  refused(
    "a lab can't be reviewed twice",
    await review(verified, ready.id, "rejected", TAG),
    "already_reviewed",
  );
  check(
    "an approved lab with an unconfirmed email stays unlisted",
    !(await isLabListed(
      (await createLab({ status: "approved", license: true, confirmed: false }))
        .id,
    )),
  );

  const notices = async (userId) =>
    (
      await db.query(
        `select kind, href from public.notifications where user_id = $1`,
        [userId],
      )
    ).rows;
  check(
    "the bell tells the lab, linking to its verification page",
    (await notices(ready.id)).some(
      (row) =>
        row.kind === "verification_approved" &&
        row.href === "/lab/verification",
    ),
  );
  const rejected = await createLab({ license: true });
  await review(verified, rejected.id, "rejected", TAG);
  const rejectedRow = await labRow(rejected.id);
  check(
    "a rejection keeps the note and isn't listed",
    rejectedRow.verification_note === TAG &&
      rejectedRow.verified_at === null &&
      !(await isLabListed(rejected.id)) &&
      (await notices(rejected.id)).some(
        (row) => row.kind === "verification_rejected",
      ),
  );

  section("Admin reads for labs (ADM-04, SEC-04)");

  refused(
    "a lab can't list the queue",
    await rpc(lab, "admin_lab_reviews"),
    "not_admin",
  );
  denied("a guest can't list the queue", await rpc(null, "admin_lab_reviews"));
  const queue = (await rpc(verified, "admin_lab_reviews")).data ?? [];
  const firstDone = queue.findIndex(
    (row) => row.verification_status !== "pending",
  );
  const pending = queue.slice(0, firstDone);
  check(
    "the queue lists pending labs first, oldest first",
    firstDone > 0 &&
      queue
        .slice(firstDone)
        .every((row) => row.verification_status !== "pending") &&
      pending.every(
        (row, index) =>
          index === 0 || pending[index - 1].created_at <= row.created_at,
      ),
  );
  check(
    "p_limit bounds each half of the queue",
    (await rpc(verified, "admin_lab_reviews", { p_limit: 1 })).data?.length ===
      2,
  );
  const one = await rpc(verified, "admin_lab_reviews", { p_lab_id: ready.id });
  check(
    "an admin reads one lab, with its email",
    one.data?.length === 1 && one.data[0].email === ready.email,
  );
  const log = await rpc(verified, "admin_audit_log", { p_user_id: ready.id });
  check(
    "the approval is in the audit log",
    log.data?.some(
      (entry) =>
        entry.action === "lab.approved" &&
        entry.actor_id === adminUser.id &&
        entry.target_type === "lab",
    ),
  );
  const submitted = await rpc(verified, "admin_audit_log", {
    p_user_id: lab.id,
  });
  check(
    "sending details is in the audit log",
    submitted.data?.some((entry) => entry.action === "lab.details_submitted"),
  );

  section("Licence access (ADM-04, SEC-07)");

  await db.query(
    `insert into storage.objects (bucket_id, name) values ('lab-documents', $1)`,
    [secondPath],
  );
  const seenLicences = async (caller) =>
    (
      await as(
        caller,
        `select name from storage.objects where bucket_id = 'lab-documents'`,
      )
    ).data?.length ?? 0;
  check("the lab sees its own licence", (await seenLicences(lab)) === 1);
  check("another lab doesn't", (await seenLicences(ready)) === 0);
  check(
    "an admin with two-factor sees it",
    (await seenLicences(verified)) === 1,
  );
  check(
    "an admin without two-factor doesn't",
    (await seenLicences(passwordOnly)) === 0,
  );
  check("a patient doesn't", (await seenLicences(patient)) === 0);
}

async function testLabCatalog({ patient }) {
  section("Lab catalog (LAB-01)");

  const lab = await createLab({ status: "approved" });
  const otherLab = await createLab({ status: "approved" });
  // A lab login whose profile is missing.
  const noProfile = await createUser("lab");
  const passwordOnly = { ...lab, aal: "aal1" };

  const saveTest = (caller, fields = {}) =>
    rpc(caller, "save_lab_test", {
      p_test_type_id: "cbc",
      p_price: 1200,
      p_turnaround_hours: 24,
      p_home_collection: true,
      p_preparation: null,
      p_listed: true,
      ...fields,
    });
  const idOf = (result) => result.data?.[0]?.[result.fn];
  const testRow = async (id) =>
    (await db.query(`select * from public.lab_tests where id = $1`, [id]))
      .rows[0];

  const cbc = await saveTest(lab);
  succeeded("a lab adds a test from the shared list", cbc);
  const cbcId = idOf(cbc);

  const again = await saveTest(lab, {
    p_price: 1100,
    p_preparation: "  Come in before 10 am.  ",
  });
  const cbcRow = await testRow(cbcId);
  check(
    "adding the same test again updates it, with the note trimmed",
    idOf(again) === cbcId &&
      cbcRow.price === 1100 &&
      cbcRow.preparation === "Come in before 10 am.",
  );
  await saveTest(lab, { p_price: 1100, p_preparation: "   " });
  check(
    "a blank note falls back to the shared one",
    (await testRow(cbcId)).preparation === null,
  );

  refused(
    "a test not on the shared list is refused",
    await saveTest(lab, { p_test_type_id: "made-up" }),
    "unknown_test",
  );
  refused("a patient can't add tests", await saveTest(patient), "not_lab");
  refused(
    "a lab without two-factor can't",
    await saveTest(passwordOnly),
    "second_factor_required",
  );
  refused(
    "a lab login with no lab profile can't",
    await saveTest(noProfile),
    "lab_not_found",
  );
  check(
    "a price of zero is refused",
    (await saveTest(lab, { p_price: 0 })).error?.code === "23514",
  );
  check(
    "a turnaround over 30 days is refused",
    (await saveTest(lab, { p_turnaround_hours: 721 })).error?.code === "23514",
  );

  const pendingLab = await createLab();
  succeeded(
    "a lab under review builds its catalog",
    await saveTest(pendingLab, { p_price: 500 }),
  );

  denied(
    "labs can't write the table directly",
    await as(lab, `update public.lab_tests set price = 1 where id = $1`, [
      cbcId,
    ]),
  );
  check(
    "a lab reads its own tests, not another lab's",
    (await as(lab, `select id from public.lab_tests`)).data?.length === 1 &&
      (
        await as(otherLab, `select id from public.lab_tests where id = $1`, [
          cbcId,
        ])
      ).data?.length === 0,
  );
  denied(
    "guests can't read labs' tests directly",
    await as(null, `select id from public.lab_tests`),
  );

  const setListed = (caller, id, listed) =>
    rpc(caller, "set_lab_test_listed", { p_test_id: id, p_listed: listed });
  succeeded("a lab unlists a test", await setListed(lab, cbcId, false));
  check("it's kept, unlisted", (await testRow(cbcId)).listed === false);
  refused(
    "another lab can't list it",
    await setListed(otherLab, cbcId, true),
    "test_not_found",
  );
  refused("a patient can't", await setListed(patient, cbcId, true), "not_lab");
  refused(
    "a lab without two-factor can't",
    await setListed(passwordOnly, cbcId, true),
    "second_factor_required",
  );
  await setListed(lab, cbcId, true);

  section("Lab packages (LAB-01)");

  const hba1cId = idOf(
    await saveTest(lab, {
      p_test_type_id: "hba1c",
      p_price: 1800,
      p_turnaround_hours: 48,
      p_home_collection: false,
    }),
  );
  const lipidId = idOf(
    await saveTest(lab, { p_test_type_id: "lipid-profile", p_price: 2200 }),
  );
  const otherCbcId = idOf(
    await saveTest(otherLab, {
      p_price: 900,
      p_turnaround_hours: 12,
      p_home_collection: false,
    }),
  );
  const otherTshId = idOf(
    await saveTest(otherLab, { p_test_type_id: "tsh", p_price: 1500 }),
  );

  const savePackage = (caller, fields = {}) =>
    rpc(caller, "save_lab_package", {
      p_package_id: null,
      p_name: "  Diabetes Care ",
      p_description: " ",
      p_price: 2500,
      p_test_ids: [cbcId, hba1cId, hba1cId],
      p_listed: true,
      ...fields,
    });
  const packageTests = async (id) =>
    (
      await db.query(
        `select lab_test_id from public.lab_package_items where package_id = $1`,
        [id],
      )
    ).rows
      .map((row) => row.lab_test_id)
      .sort();

  const created = await savePackage(lab);
  succeeded("a lab makes a package from its tests", created);
  const packageId = idOf(created);
  const packageRow = (
    await db.query(`select * from public.lab_packages where id = $1`, [
      packageId,
    ])
  ).rows[0];
  check(
    "a repeated test counts once; the name is trimmed, a blank description dropped",
    (await packageTests(packageId)).length === 2 &&
      packageRow.name === "Diabetes Care" &&
      packageRow.description === null,
  );

  refused(
    "a package needs at least two tests",
    await savePackage(lab, { p_test_ids: [cbcId] }),
    "package_size",
  );
  refused(
    "another lab's test can't go in",
    await savePackage(lab, { p_test_ids: [cbcId, otherCbcId] }),
    "test_not_found",
  );
  refused("a patient can't make one", await savePackage(patient), "not_lab");
  refused(
    "a lab without two-factor can't",
    await savePackage(passwordOnly),
    "second_factor_required",
  );
  refused(
    "a lab login with no lab profile can't",
    await savePackage(noProfile),
    "lab_not_found",
  );

  const edited = await savePackage(lab, {
    p_package_id: packageId,
    p_test_ids: [hba1cId, lipidId],
    p_price: 3500,
  });
  check(
    "editing a package replaces its tests",
    idOf(edited) === packageId &&
      JSON.stringify(await packageTests(packageId)) ===
        JSON.stringify([hba1cId, lipidId].sort()),
    edited.error?.message ?? "",
  );
  refused(
    "another lab can't edit it",
    await savePackage(otherLab, {
      p_package_id: packageId,
      p_test_ids: [otherCbcId, otherTshId],
    }),
    "package_not_found",
  );

  await db.query(
    `insert into public.lab_packages (lab_id, name, price)
     select $1, 'Bulk ' || n, 100 from generate_series(1, 49) as n`,
    [lab.id],
  );
  refused(
    "a lab has at most 50 packages",
    await savePackage(lab),
    "too_many_packages",
  );
  await db.query(
    `delete from public.lab_packages where lab_id = $1 and name like 'Bulk %'`,
    [lab.id],
  );

  const setPackageListed = (caller, id, listed) =>
    rpc(caller, "set_lab_package_listed", {
      p_package_id: id,
      p_listed: listed,
    });
  refused(
    "another lab can't unlist a package",
    await setPackageListed(otherLab, packageId, false),
    "package_not_found",
  );
  refused(
    "a patient can't",
    await setPackageListed(patient, packageId, false),
    "not_lab",
  );
  refused(
    "a lab without two-factor can't",
    await setPackageListed(passwordOnly, packageId, false),
    "second_factor_required",
  );

  section("What patients see (LAB-02)");

  const offers = async (testTypeId) =>
    (
      await as(
        null,
        `select lab_id, price, preparation from public.lab_test_offers
         where test_type_id = $1 order by price`,
        [testTypeId],
      )
    ).data ?? [];
  const catalogRow = async (testTypeId) =>
    (
      await as(null, `select * from public.lab_test_catalog where id = $1`, [
        testTypeId,
      ])
    ).data?.[0];
  const packageOffer = async (id) =>
    (
      await as(null, `select * from public.lab_package_offers where id = $1`, [
        id,
      ])
    ).data?.[0];

  const cbcOffers = await offers("cbc");
  check(
    "a guest compares a test across approved labs, cheapest first",
    cbcOffers.length === 2 &&
      cbcOffers[0].lab_id === otherLab.id &&
      cbcOffers[1].lab_id === lab.id,
    `${cbcOffers.length} offers`,
  );
  check(
    "a lab under review stays out",
    !cbcOffers.some((offer) => offer.lab_id === pendingLab.id),
  );
  check(
    "with no note of its own, a lab shows the shared preparation",
    cbcOffers[0].preparation === "No special preparation needed.",
  );
  // Home collection shows only while the lab collects at home (LAB-06).
  await rpc(lab, "save_lab_service_area", {
    p_id: null,
    p_city: "Lahore",
    p_fee: 300,
    p_note: null,
  });
  await rpc(lab, "save_lab_collection_schedule", {
    p_ranges: JSON.stringify([{ weekday: 1, start: "07:00", end: "11:00" }]),
    p_slot_minutes: 60,
    p_capacity: 2,
    p_notice_hours: 2,
    p_free_above: null,
    p_accepting: true,
  });
  const cbcSummary = await catalogRow("cbc");
  check(
    "the catalog sums a test up: labs, lowest price, fastest result, home collection",
    cbcSummary?.lab_count === 2 &&
      cbcSummary.lowest_price === 900 &&
      cbcSummary.fastest_hours === 12 &&
      cbcSummary.home_collection === true,
    JSON.stringify(cbcSummary ?? {}),
  );
  check(
    "a test no lab offers isn't in the catalog",
    (await catalogRow("ogtt")) === undefined,
  );
  check(
    "search matches other names",
    (
      await as(
        null,
        `select id from public.lab_test_catalog where search_text ilike $1`,
        ["%blood cp%"],
      )
    ).data?.[0]?.id === "cbc",
  );

  await setListed(otherLab, otherCbcId, false);
  check(
    "an unlisted test drops out",
    (await offers("cbc")).length === 1 &&
      (await catalogRow("cbc"))?.lab_count === 1,
  );

  const offer = await packageOffer(packageId);
  check(
    "a package shows its tests' separate price, slowest result and home collection",
    offer?.separate_price === 4000 &&
      offer.turnaround_hours === 48 &&
      offer.home_collection === false &&
      JSON.stringify(offer.test_names) ===
        JSON.stringify(["HbA1c", "Lipid Profile"]),
    JSON.stringify(offer ?? {}),
  );
  await setListed(lab, lipidId, false);
  check(
    "a package with an unlisted test is hidden",
    (await packageOffer(packageId)) === undefined,
  );
  await setListed(lab, lipidId, true);
  succeeded(
    "a lab unlists a package",
    await setPackageListed(lab, packageId, false),
  );
  check(
    "an unlisted package is hidden",
    (await packageOffer(packageId)) === undefined,
  );

  const deletePackage = (caller, id) =>
    rpc(caller, "delete_lab_package", { p_package_id: id });
  refused(
    "another lab can't delete a package",
    await deletePackage(otherLab, packageId),
    "package_not_found",
  );
  refused(
    "a patient can't",
    await deletePackage(patient, packageId),
    "not_lab",
  );
  refused(
    "a lab without two-factor can't",
    await deletePackage(passwordOnly, packageId),
    "second_factor_required",
  );
  succeeded("a lab deletes a package", await deletePackage(lab, packageId));
  check(
    "its tests go with it, and the lab's tests stay",
    (await packageTests(packageId)).length === 0 &&
      (await testRow(hba1cId)) !== undefined,
  );
}

async function testCareRecipients({ patient, secondPatient }) {
  section("Care recipients (PRO-03)");

  const doctor = await createDoctor();
  const selfRow = async (accountId) =>
    (
      await db.query(
        `select * from public.care_recipients
         where account_id = $1 and relation = 'self'`,
        [accountId],
      )
    ).rows[0];

  const self = await selfRow(patient.id);
  check(
    "a new patient gets a self row with their name",
    self?.first_name === "Sql" && self?.last_name === "Patient",
  );

  await db.query(
    `update public.patient_profiles set first_name = 'Renamed' where id = $1`,
    [patient.id],
  );
  check(
    "a name change reaches the self row",
    (await selfRow(patient.id))?.first_name === "Renamed",
  );

  const [slot] = await slotsOf(doctor.id);
  const booked = await rpc(patient, "book_appointment", {
    p_doctor_id: doctor.id,
    p_starts_at: slot.starts_at,
  });
  check(
    "a booking is for the patient themself",
    booked.data?.[0]?.book_appointment?.care_recipient_id === self?.id,
  );

  const visit = await startedVisit(doctor, patient);
  const rx = issued(await issue(doctor, visit));
  check(
    "a prescription names the same person",
    rx?.care_recipient_id === self?.id,
  );

  const noProfile = await createUser("patient");
  const noProfileVisit = await createAppointment(doctor, noProfile, {
    from: 300,
  });
  const fallback = await selfRow(noProfile.id);
  check(
    "an account with no profile still gets a recipient",
    (await appointmentRow(noProfileVisit)).care_recipient_id === fallback?.id &&
      fallback?.first_name === TAG,
  );

  const { rows: dependents } = await db.query(
    `insert into public.care_recipients (account_id, relation, first_name, last_name)
     values ($1, 'parent', 'Mother', 'Patient') returning id`,
    [patient.id],
  );
  const mother = dependents[0].id;

  const otherAccounts = await db
    .query(
      `update public.appointments set care_recipient_id = $1 where id = $2`,
      [(await selfRow(secondPatient.id))?.id, visit],
    )
    .catch((error) => ({ error }));
  check(
    "a record can't name someone from another account",
    otherAccounts.error?.code === "23503",
    otherAccounts.error?.code,
  );

  const secondSelf = await db
    .query(
      `insert into public.care_recipients (account_id, relation, first_name, last_name)
       values ($1, 'self', 'Two', 'Selves')`,
      [patient.id],
    )
    .catch((error) => ({ error }));
  check("an account has one self row", secondSelf.error?.code === "23505");

  const hasRecords = await db
    .query(`delete from public.care_recipients where id = $1`, [self.id])
    .catch((error) => ({ error }));
  check(
    "someone with records can't be deleted alone",
    hasRecords.error?.code === "23503",
    hasRecords.error?.code,
  );

  section("Who can read them (PRO-03, PRV-03)");

  const recipients = `select id from public.care_recipients`;
  check(
    "an account reads its own people",
    (await as(patient, recipients)).data?.length === 2,
  );
  check(
    "another patient reads none of them",
    !(await as(secondPatient, recipients)).data?.some(
      (row) => row.id === mother,
    ),
  );
  check(
    "a doctor doesn't read someone never booked with them",
    !(await as(doctor, recipients)).data?.some((row) => row.id === mother),
  );
  denied("guests read nothing", await as(null, recipients));
  denied(
    "patients can't write them directly",
    await as(
      patient,
      `update public.care_recipients set blood_group = 'O+' where id = $1`,
      [self.id],
    ),
  );
  denied(
    "patients can't write their profile directly",
    await as(
      patient,
      `update public.patient_profiles set phone = '0000000' where id = $1`,
      [patient.id],
    ),
  );

  section("Deleting an account (PRO-03)");

  const leaving = await createPatient();
  const leavingVisit = await startedVisit(doctor, leaving, {
    from: -120,
    to: -90,
  });
  await issue(doctor, leavingVisit);
  const deleted = await db
    .query(`delete from auth.users where id = $1`, [leaving.id])
    .catch((error) => ({ error }));
  check(
    "an account with records can still be deleted",
    !deleted.error,
    deleted.error?.message,
  );
  check("its recipients go with it", (await selfRow(leaving.id)) === undefined);
}

async function testDoctorMedicalProfiles({ patient, secondPatient }) {
  section("Doctors read medical profiles (PRO-02)");

  const doctor = await createDoctor();
  const otherDoctor = await createDoctor();
  const cancelledOnly = await createDoctor();
  const selfOf = async (accountId) =>
    (
      await db.query(
        `select id from public.care_recipients
         where account_id = $1 and relation = 'self'`,
        [accountId],
      )
    ).rows[0].id;

  await createAppointment(doctor, patient, { from: 600 });
  await createAppointment(cancelledOnly, patient, { status: "cancelled" });
  await createAppointment(otherDoctor, secondPatient);
  await db.query(
    `update public.care_recipients set allergies = '{Penicillin}' where id = $1`,
    [await selfOf(patient.id)],
  );

  const self = await selfOf(patient.id);
  const profile = `select id, allergies from public.care_recipients where id = $1`;
  const read = await as(doctor, profile, [self]);
  check(
    "a doctor reads the profile of someone booked with them",
    read.data?.[0]?.allergies?.[0] === "Penicillin",
    read.error?.message,
  );
  check(
    "a doctor with only a cancelled booking reads nothing",
    (await as(cancelledOnly, profile, [self])).data?.length === 0,
  );
  check(
    "a doctor doesn't read another doctor's patient",
    (await as(otherDoctor, profile, [self])).data?.length === 0,
  );
  check(
    "a doctor reads only their own patients",
    (
      await as(doctor, `select account_id from public.care_recipients`)
    ).data?.every((row) => row.account_id === patient.id),
  );
  check(
    "a doctor without a second factor reads nothing",
    (await as({ ...doctor, aal: "aal1" }, profile, [self])).data?.length === 0,
  );

  const { rows: dependents } = await db.query(
    `insert into public.care_recipients (account_id, relation, first_name, last_name)
     values ($1, 'child', 'Child', 'Patient') returning id`,
    [patient.id],
  );
  check(
    "booking the account holder doesn't open their family's profiles",
    (await as(doctor, profile, [dependents[0].id])).data?.length === 0,
  );

  denied(
    "a doctor can't change a profile",
    await as(
      doctor,
      `update public.care_recipients set allergies = '{}' where id = $1`,
      [self],
    ),
  );
  const unchanged = await db.query(
    `select allergies from public.care_recipients where id = $1`,
    [self],
  );
  check(
    "the profile is unchanged",
    unchanged.rows[0].allergies[0] === "Penicillin",
  );
}

async function testPatientAddresses({ patient, secondPatient }) {
  section("Address book (PRO-07)");

  const address = (fields = {}) => ({
    p_id: null,
    p_label: " Home ",
    p_street_address: "House 21, Street 5",
    p_area: "G-10/2",
    p_city: "Islamabad",
    p_contact_phone: "+92 300 1234567",
    p_landmark: "  ",
    ...fields,
  });
  const save = (caller, fields) =>
    rpc(caller, "save_patient_address", address(fields));
  const remove = (caller, id) =>
    rpc(caller, "delete_patient_address", { p_id: id });
  const savedId = (result) => result.data?.[0]?.save_patient_address;
  const rows = async (accountId) =>
    (
      await db.query(
        `select * from public.patient_addresses where account_id = $1 order by created_at`,
        [accountId],
      )
    ).rows;
  const defaults = async (accountId) =>
    (await rows(accountId))
      .filter((row) => row.is_default)
      .map((row) => row.id);

  const first = await save(patient);
  const homeId = savedId(first);
  const [home] = await rows(patient.id);
  check(
    "a patient adds an address, trimmed, and the first is the default",
    home?.id === homeId &&
      home.label === "Home" &&
      home.landmark === null &&
      home.is_default === true,
    first.error?.message,
  );

  const officeId = savedId(
    await save(patient, { p_label: "Office", p_area: "Blue Area" }),
  );
  check(
    "a second address doesn't take the default",
    (await defaults(patient.id)).join() === homeId,
  );

  succeeded(
    "the patient makes another address the default",
    await save(patient, {
      p_id: officeId,
      p_label: "Office",
      p_is_default: true,
    }),
  );
  check(
    "only that one is the default",
    (await defaults(patient.id)).join() === officeId,
  );

  succeeded(
    "editing the default without the flag keeps it the default",
    await save(patient, {
      p_id: officeId,
      p_label: "Work",
      p_is_default: false,
    }),
  );
  check(
    "and the edit is saved",
    (await defaults(patient.id)).join() === officeId &&
      (await rows(patient.id)).find((row) => row.id === officeId)?.label ===
        "Work",
  );

  refused(
    "another patient can't edit it",
    await save(secondPatient, { p_id: homeId }),
    "address_not_found",
  );
  refused(
    "another patient can't delete it",
    await remove(secondPatient, homeId),
    "address_not_found",
  );
  check(
    "another patient reads none of it",
    (await as(secondPatient, `select id from public.patient_addresses`)).data
      ?.length === 0,
  );
  check(
    "the owner reads their own",
    (await as(patient, `select id from public.patient_addresses`)).data
      ?.length === 2,
  );
  denied(
    "nobody writes the table directly",
    await as(
      patient,
      `update public.patient_addresses set label = 'x' where id = $1`,
      [homeId],
    ),
  );

  const doctor = await createDoctor();
  refused("a doctor can't save one", await save(doctor), "not_patient");
  refused(
    "a doctor can't delete one",
    await remove(doctor, homeId),
    "not_patient",
  );
  refused(
    "a blank area is refused",
    await save(patient, { p_area: "  " }),
    "invalid_address",
  );
  refused(
    "a street address over 200 characters is refused",
    await save(patient, { p_street_address: "x".repeat(201) }),
    "invalid_address",
  );
  refused(
    "a phone with letters is refused",
    await save(patient, { p_contact_phone: "call me" }),
    "invalid_address",
  );
  refused(
    "a city outside the list is refused",
    await save(patient, { p_city: "lahore" }),
    "invalid_address",
  );

  const appCities = [
    ...(
      await readFile(new URL("../src/lib/cities.ts", import.meta.url), "utf8")
    ).matchAll(/^\s+"([^"]+)",$/gm),
  ].map((match) => match[1]);
  const { rows: sqlCities } = await db.query(
    `select unnest(private.cities()) as city`,
  );
  check(
    "the database's cities match src/lib/cities.ts",
    appCities.length > 0 &&
      appCities.join("|") === sqlCities.map((row) => row.city).join("|"),
  );

  succeeded("deleting the default works", await remove(patient, officeId));
  check(
    "and the remaining address becomes the default",
    (await defaults(patient.id)).join() === homeId,
  );
  succeeded("deleting the last address works", await remove(patient, homeId));
  check("none are left", (await rows(patient.id)).length === 0);

  for (let index = 0; index < 10; index++) {
    await save(secondPatient, { p_label: `Place ${index}` });
  }
  refused(
    "an eleventh address is refused",
    await save(secondPatient),
    "too_many_addresses",
  );
  const places = await rows(secondPatient.id);
  check(
    "ten addresses, one default",
    places.length === 10 && (await defaults(secondPatient.id)).length === 1,
  );
  await save(secondPatient, {
    p_id: places[5].id,
    p_label: "Place 5",
    p_is_default: true,
  });
  await save(secondPatient, {
    p_id: places[9].id,
    p_label: "Place 9",
    p_is_default: true,
  });
  await remove(secondPatient, places[9].id);
  check(
    "deleting the default hands it to the oldest address",
    (await defaults(secondPatient.id)).join() === places[0].id,
  );

  const paired = await createPatient();
  await db.query(
    `insert into auth.mfa_factors (user_id, status) values ($1, 'verified')`,
    [paired.id],
  );
  check(
    "a patient who paired an app needs it to save an address",
    (await save(paired)).error?.message === "second_factor_required",
  );
  succeeded("with the app they can", await save({ ...paired, aal: "aal2" }));
  check(
    "and with only a password they read nothing",
    (await as(paired, `select id from public.patient_addresses`)).data
      ?.length === 0,
  );
}

async function testHomeCollection({ patient }) {
  section("Home collection setup (LAB-06)");

  const lab = await createLab({ status: "approved" });
  const otherLab = await createLab({ status: "approved" });
  const noProfile = await createUser("lab");
  const passwordOnly = { ...lab, aal: "aal1" };
  const weekdays = (start, end) =>
    [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, start, end }));

  const saveSchedule = (caller, fields = {}) =>
    rpc(caller, "save_lab_collection_schedule", {
      p_ranges: JSON.stringify([{ weekday: 1, start: "07:00", end: "11:00" }]),
      p_slot_minutes: 60,
      p_capacity: 3,
      p_notice_hours: 2,
      p_free_above: null,
      p_accepting: false,
      ...fields,
    });
  const saveArea = (caller, fields = {}) =>
    rpc(caller, "save_lab_service_area", {
      p_id: null,
      p_city: "Lahore",
      p_fee: 300,
      p_note: null,
      ...fields,
    });
  const deleteArea = (caller, id) =>
    rpc(caller, "delete_lab_service_area", { p_id: id });
  const idOf = (result) => result.data?.[0]?.[result.fn];
  const settings = async (labId) =>
    (
      await db.query(
        `select * from public.lab_collection_settings where lab_id = $1`,
        [labId],
      )
    ).rows[0];
  const hours = async (labId) =>
    (
      await db.query(
        `select weekday, start_time::text, end_time::text
         from public.lab_collection_hours where lab_id = $1 order by weekday, start_time`,
        [labId],
      )
    ).rows;

  succeeded(
    "a lab saves its hours with collection off",
    await saveSchedule(lab, {
      p_ranges: JSON.stringify([
        { weekday: 1, start: "07:00", end: "09:00" },
        { weekday: 1, start: "16:00", end: "18:00" },
      ]),
      p_free_above: 3000,
    }),
  );
  check(
    "the hours and settings are stored",
    (await hours(lab.id)).length === 2 &&
      (await settings(lab.id))?.free_above === 3000 &&
      (await settings(lab.id))?.accepting === false,
  );
  await saveSchedule(lab);
  check(
    "saving again replaces the week",
    (await hours(lab.id)).map((h) => h.start_time).join() === "07:00:00",
  );

  const inLock = (result) => ({ ...result, fn: "lock_collection_lab" });
  refused("a patient can't", inLock(await saveSchedule(patient)), "not_lab");
  refused(
    "a lab without two-factor can't",
    inLock(await saveSchedule(passwordOnly)),
    "second_factor_required",
  );
  refused(
    "a lab login with no profile can't",
    inLock(await saveSchedule(noProfile)),
    "lab_not_found",
  );
  refused(
    "a slot length off the list is refused",
    await saveSchedule(lab, { p_slot_minutes: 45 }),
    "invalid_collection_settings",
  );
  refused(
    "a capacity over 20 is refused",
    await saveSchedule(lab, { p_capacity: 21 }),
    "invalid_collection_settings",
  );
  refused(
    "a free-above amount of zero is refused",
    await saveSchedule(lab, { p_free_above: 0 }),
    "invalid_collection_settings",
  );
  refused(
    "a time that doesn't parse is refused",
    await saveSchedule(lab, {
      p_ranges: JSON.stringify([{ weekday: 1, start: "25:00", end: "26:00" }]),
    }),
    "invalid_schedule",
  );
  refused(
    "24:00 is refused, as in the editor",
    await saveSchedule(lab, {
      p_ranges: JSON.stringify([{ weekday: 1, start: "20:00", end: "24:00" }]),
    }),
    "invalid_schedule",
  );
  refused(
    "an end before its start is refused",
    await saveSchedule(lab, {
      p_ranges: JSON.stringify([{ weekday: 1, start: "11:00", end: "07:00" }]),
    }),
    "invalid_schedule",
  );
  refused(
    "a range shorter than a slot is refused",
    await saveSchedule(lab, {
      p_ranges: JSON.stringify([{ weekday: 1, start: "07:00", end: "07:30" }]),
    }),
    "invalid_schedule",
  );
  refused(
    "four ranges in a day are refused",
    await saveSchedule(lab, {
      p_ranges: JSON.stringify(
        ["06", "09", "12", "15"].map((hour) => ({
          weekday: 2,
          start: `${hour}:00`,
          end: `${hour}:59`,
        })),
      ),
      p_slot_minutes: 30,
    }),
    "invalid_schedule",
  );
  refused(
    "something other than a list is refused",
    await saveSchedule(lab, { p_ranges: JSON.stringify({ weekday: 1 }) }),
    "invalid_schedule",
  );
  refused(
    "overlapping ranges are refused",
    await saveSchedule(lab, {
      p_ranges: JSON.stringify([
        { weekday: 1, start: "07:00", end: "10:00" },
        { weekday: 1, start: "09:00", end: "11:00" },
      ]),
    }),
    "overlapping_hours",
  );
  check(
    "a refused save leaves the old hours",
    (await hours(lab.id)).length === 1,
  );
  refused(
    "collection can't be on without hours",
    await saveSchedule(lab, { p_ranges: "[]", p_accepting: true }),
    "no_collection_hours",
  );
  refused(
    "or without a city",
    await saveSchedule(lab, { p_accepting: true }),
    "no_service_areas",
  );

  section("Service areas (LAB-06)");

  const lahore = await saveArea(lab, { p_note: "  All of\n  Lahore  " });
  succeeded("a lab adds a city", lahore);
  const lahoreId = idOf(lahore);
  const areaRow = async (id) =>
    (
      await db.query(`select * from public.lab_service_areas where id = $1`, [
        id,
      ])
    ).rows[0];
  check(
    "the note is kept on one line",
    (await areaRow(lahoreId))?.note === "All of Lahore",
  );
  refused(
    "the same city twice is refused",
    await saveArea(lab),
    "duplicate_service_area",
  );
  refused(
    "a city off the list is refused",
    await saveArea(lab, { p_city: "lahore" }),
    "invalid_service_area",
  );
  refused(
    "a negative fee is refused",
    await saveArea(lab, { p_city: "Multan", p_fee: -1 }),
    "invalid_service_area",
  );
  refused(
    "a note over 200 characters is refused",
    await saveArea(lab, { p_city: "Multan", p_note: "x".repeat(201) }),
    "invalid_service_area",
  );
  const sheikhupura = await saveArea(lab, {
    p_city: "Sheikhupura",
    p_fee: 800,
  });
  succeeded("a second city with its own fee", sheikhupura);
  refused(
    "renaming it to a city already there is refused",
    await saveArea(lab, { p_id: idOf(sheikhupura), p_city: "Lahore" }),
    "duplicate_service_area",
  );
  succeeded(
    "a lab edits a city's fee",
    await saveArea(lab, { p_id: lahoreId, p_fee: 0, p_note: " " }),
  );
  check(
    "a free city with no note",
    (await areaRow(lahoreId))?.fee === 0 &&
      (await areaRow(lahoreId))?.note === null,
  );
  refused(
    "another lab can't edit it",
    await saveArea(otherLab, { p_id: lahoreId, p_city: "Multan" }),
    "service_area_not_found",
  );
  refused(
    "or delete it",
    await deleteArea(otherLab, lahoreId),
    "service_area_not_found",
  );
  refused(
    "a patient can't add a city",
    inLock(await saveArea(patient)),
    "not_lab",
  );
  denied(
    "labs can't write the tables directly",
    await as(lab, `update public.lab_service_areas set fee = 1 where id = $1`, [
      lahoreId,
    ]),
  );
  denied(
    "or their hours",
    await as(lab, `delete from public.lab_collection_hours`),
  );
  check(
    "a lab reads its own areas, not another lab's",
    (await as(lab, `select id from public.lab_service_areas`)).data?.length ===
      2 &&
      (await as(otherLab, `select id from public.lab_service_areas`)).data
        ?.length === 0 &&
      (await as(otherLab, `select lab_id from public.lab_collection_settings`))
        .data?.length === 0,
  );
  denied(
    "guests can't read the tables directly",
    await as(null, `select id from public.lab_service_areas`),
  );

  section("What patients see of home collection (LAB-06)");

  const cbc = await rpc(lab, "save_lab_test", {
    p_test_type_id: "cbc",
    p_price: 900,
    p_turnaround_hours: 24,
    p_home_collection: true,
    p_preparation: null,
    p_listed: true,
  });
  const hba1c = await rpc(lab, "save_lab_test", {
    p_test_type_id: "hba1c",
    p_price: 1500,
    p_turnaround_hours: 24,
    p_home_collection: true,
    p_preparation: null,
    p_listed: true,
  });
  const labPackage = await rpc(lab, "save_lab_package", {
    p_package_id: null,
    p_name: "Sugar check",
    p_description: null,
    p_price: 2000,
    p_test_ids: [idOf(cbc), idOf(hba1c)],
    p_listed: true,
  });
  const offerCollects = async () =>
    (
      await as(
        null,
        `select home_collection from public.lab_test_offers where id = $1`,
        [idOf(cbc)],
      )
    ).data?.[0]?.home_collection;
  const packageCollects = async () =>
    (
      await as(
        null,
        `select home_collection from public.lab_package_offers where id = $1`,
        [idOf(labPackage)],
      )
    ).data?.[0]?.home_collection;
  const areasFor = async (labId) =>
    (
      await as(
        null,
        `select city, fee, note, free_above from public.lab_collection_areas
         where lab_id = $1 order by city`,
        [labId],
      )
    ).data ?? [];
  const slots = (labId, days = 7) =>
    rpc(patient, "get_lab_collection_slots", { p_lab_id: labId, p_days: days });

  check(
    "a ticked test shows no home collection while it's off",
    (await offerCollects()) === false && (await packageCollects()) === false,
  );
  check("no cities show", (await areasFor(lab.id)).length === 0);
  check("no slots show", (await slots(lab.id)).data?.length === 0);

  succeeded(
    "with hours and a city, collection goes on",
    await saveSchedule(lab, {
      p_ranges: JSON.stringify(weekdays("00:00", "23:00")),
      p_accepting: true,
      p_free_above: 2500,
    }),
  );
  check(
    "now the test and package show home collection",
    (await offerCollects()) === true && (await packageCollects()) === true,
  );
  const shownAreas = await areasFor(lab.id);
  check(
    "guests see each city's fee and the free-above amount",
    shownAreas.map((area) => `${area.city}:${area.fee}`).join() ===
      "Lahore:0,Sheikhupura:800" && shownAreas[0].free_above === 2500,
  );

  const week = (await slots(lab.id)).data ?? [];
  const now = Date.now();
  check(
    "guests see a week of one-hour slots",
    week.length > 100 &&
      week.every(
        (slot) =>
          new Date(slot.ends_at) - new Date(slot.starts_at) === 3_600_000,
      ),
    `${week.length} slots`,
  );
  check(
    "each with the full capacity",
    week.every((slot) => slot.spots_left === 3),
  );
  check(
    "none inside the two-hour notice",
    week.every(
      (slot) => new Date(slot.starts_at) - now >= 2 * 3_600_000 - 5000,
    ),
  );
  const longest = (await slots(lab.id, 60)).data ?? [];
  check(
    "at most 14 days ahead",
    longest.length > week.length &&
      new Date(longest.at(-1).starts_at) - now <= 15 * 86_400_000,
  );

  refused(
    "the last city can't go while collection is on",
    await deleteArea(lab, idOf(sheikhupura)).then(() =>
      deleteArea(lab, lahoreId),
    ),
    "last_service_area",
  );
  check("it's kept", Boolean(await areaRow(lahoreId)));

  const pendingLab = await createLab();
  await saveArea(pendingLab);
  succeeded(
    "a lab under review sets up collection",
    await saveSchedule(pendingLab, { p_accepting: true }),
  );
  check(
    "but patients don't see it yet",
    (await areasFor(pendingLab.id)).length === 0 &&
      (await slots(pendingLab.id)).data?.length === 0,
  );

  await saveSchedule(lab, { p_accepting: false });
  check(
    "pausing hides the cities, slots and badges",
    (await areasFor(lab.id)).length === 0 &&
      (await slots(lab.id)).data?.length === 0 &&
      (await offerCollects()) === false,
  );
  succeeded("and then the last city can go", await deleteArea(lab, lahoreId));
}

async function testLabBooking({ patient, secondPatient }) {
  section("Booking a lab test (LAB-03)");

  const lab = await createLab({ status: "approved" });
  const pendingLab = await createLab();
  const idOf = (result) => result.data?.[0]?.[result.fn];
  const addTest = async (caller, testTypeId, fields = {}) =>
    idOf(
      await rpc(caller, "save_lab_test", {
        p_test_type_id: testTypeId,
        p_price: 1000,
        p_turnaround_hours: 24,
        p_home_collection: true,
        p_preparation: null,
        p_listed: true,
        ...fields,
      }),
    );
  const cbc = await addTest(lab, "cbc", { p_price: 900 });
  const hba1c = await addTest(lab, "hba1c", { p_price: 1500 });
  const lipid = await addTest(lab, "lipid-profile", { p_price: 2200 });
  const urine = await addTest(lab, "urine-re", {
    p_price: 400,
    p_home_collection: false,
  });
  const unlisted = await addTest(lab, "tsh", { p_listed: false });
  const pendingTest = await addTest(pendingLab, "cbc");
  const sugarPackage = idOf(
    await rpc(lab, "save_lab_package", {
      p_package_id: null,
      p_name: "Sugar check",
      p_description: null,
      p_price: 2000,
      p_test_ids: [cbc, hba1c],
      p_listed: true,
    }),
  );
  check(
    "the fixtures are in place",
    [cbc, hba1c, lipid, urine, unlisted, pendingTest, sugarPackage].every(
      Boolean,
    ),
  );

  const address = async (caller, city) =>
    idOf(
      await rpc(caller, "save_patient_address", {
        p_id: null,
        p_label: "Home",
        p_street_address: "House 1, Street 2",
        p_area: "Model Town",
        p_city: city,
        p_contact_phone: "+92 300 1234567",
      }),
    );
  const lahoreHome = await address(patient, "Lahore");
  const karachiHome = await address(patient, "Karachi");
  const otherHome = await address(secondPatient, "Lahore");
  const child = idOf(
    await rpc(patient, "save_family_member", {
      p_id: null,
      p_first_name: "Little",
      p_last_name: "One",
      p_relation: "child",
      p_date_of_birth: "2018-04-02",
      p_gender: "Female",
    }),
  );

  const localToday = () =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(
      new Date(),
    );
  const addDays = (key, days) =>
    new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY)
      .toISOString()
      .slice(0, 10);

  const book = (caller, fields = {}) =>
    rpc(caller, "book_lab_test", {
      p_request_id: randomUUID(),
      p_lab_id: lab.id,
      p_lab_test_ids: [cbc],
      p_package_ids: [],
      p_collection: "lab",
      p_visit_date: addDays(localToday(), 1),
      p_slot_starts_at: null,
      p_address_id: null,
      p_care_recipient_id: null,
      ...fields,
    });
  const bookingRow = async (id) =>
    (await db.query(`select * from public.lab_bookings where id = $1`, [id]))
      .rows[0];
  const itemsOf = async (id) =>
    (
      await db.query(
        `select name, price, test_names, lab_test_id, package_id
         from public.lab_booking_items where booking_id = $1 order by name`,
        [id],
      )
    ).rows;

  denied("a guest can't book", await book(null));
  refused("a lab can't book", await book(lab), "not_patient");

  const visit = await book(patient, {
    p_lab_test_ids: [cbc, hba1c],
    p_care_recipient_id: child,
  });
  succeeded("a patient books two tests as a lab visit", visit);
  const visitId = idOf(visit);
  const visitRow = await bookingRow(visitId);
  check(
    "the booking keeps the total, lab and the person tested",
    visitRow?.status === "booked" &&
      visitRow.collection === "lab" &&
      visitRow.subtotal === 2400 &&
      visitRow.collection_fee === 0 &&
      visitRow.total === 2400 &&
      visitRow.lab_name === "Sql Lab" &&
      visitRow.care_recipient_name === "Little One" &&
      visitRow.care_recipient_relation === "child" &&
      visitRow.care_recipient_gender === "Female" &&
      visitRow.patient_name === "Sql Patient" &&
      visitRow.payment_method === "cash" &&
      visitRow.payment_status === "unpaid" &&
      visitRow.street_address === null,
  );
  const visitItems = await itemsOf(visitId);
  check(
    "each item keeps its name and price",
    visitItems.map((item) => `${item.name}:${item.price}`).join() ===
      "Complete Blood Count (CBC):900,HbA1c (Glycated Haemoglobin):1500" ||
      (visitItems.length === 2 &&
        visitItems.reduce((sum, item) => sum + item.price, 0) === 2400),
    visitItems.map((item) => item.name).join(", "),
  );

  await rpc(lab, "save_lab_test", {
    p_test_type_id: "cbc",
    p_price: 5000,
    p_turnaround_hours: 24,
    p_home_collection: true,
    p_preparation: null,
    p_listed: true,
  });
  check(
    "a later price change leaves the booking alone",
    (await bookingRow(visitId)).total === 2400,
  );
  await rpc(lab, "save_lab_test", {
    p_test_type_id: "cbc",
    p_price: 900,
    p_turnaround_hours: 24,
    p_home_collection: true,
    p_preparation: null,
    p_listed: true,
  });

  const requestId = randomUUID();
  const first = await book(patient, { p_request_id: requestId });
  const again = await book(patient, {
    p_request_id: requestId,
    p_lab_test_ids: [lipid],
  });
  check(
    "sending the same request again returns the same booking",
    idOf(first) && idOf(first) === idOf(again),
  );
  check(
    "and books nothing more",
    (
      await db.query(
        `select count(*)::int as n from public.lab_bookings where request_id = $1`,
        [requestId],
      )
    ).rows[0].n === 1,
  );
  const sameKeyOther = await book(secondPatient, { p_request_id: requestId });
  check(
    "another account's request id is its own",
    idOf(sameKeyOther) && idOf(sameKeyOther) !== idOf(first),
  );

  const pkg = await book(patient, {
    p_lab_test_ids: [lipid],
    p_package_ids: [sugarPackage],
  });
  succeeded("a package and a test book together", pkg);
  const pkgItems = await itemsOf(idOf(pkg));
  check(
    "the package keeps its tests' names",
    pkgItems.some(
      (item) =>
        item.package_id === sugarPackage && item.test_names.length === 2,
    ) && (await bookingRow(idOf(pkg))).subtotal === 4200,
  );

  refused(
    "a missing request id is refused",
    await book(patient, { p_request_id: null }),
    "invalid_booking",
  );
  refused(
    "an unknown collection is refused",
    await book(patient, { p_collection: "post" }),
    "invalid_booking",
  );
  refused(
    "no items is refused",
    await book(patient, { p_lab_test_ids: [] }),
    "invalid_items",
  );
  refused(
    "the same test twice is refused",
    await book(patient, { p_lab_test_ids: [cbc, cbc] }),
    "invalid_items",
  );
  refused(
    "more than 20 items is refused",
    await book(patient, {
      p_lab_test_ids: Array.from({ length: 21 }, () => randomUUID()),
    }),
    "invalid_items",
  );
  refused(
    "a test also inside a package is refused",
    await book(patient, {
      p_lab_test_ids: [cbc],
      p_package_ids: [sugarPackage],
    }),
    "duplicate_test",
  );
  refused(
    "an unlisted test is refused",
    await book(patient, { p_lab_test_ids: [unlisted] }),
    "item_unavailable",
  );
  refused(
    "another lab's test is refused",
    await book(patient, { p_lab_test_ids: [pendingTest] }),
    "item_unavailable",
  );
  refused(
    "a lab under review can't be booked",
    await book(patient, {
      p_lab_id: pendingLab.id,
      p_lab_test_ids: [pendingTest],
    }),
    "lab_not_found",
  );
  refused(
    "someone else's family member is refused",
    await book(secondPatient, { p_care_recipient_id: child }),
    "invalid_care_recipient",
  );
  refused(
    "a visit day in the past is refused",
    await book(patient, { p_visit_date: addDays(localToday(), -1) }),
    "invalid_visit_date",
  );
  refused(
    "a visit day more than 13 days ahead is refused",
    await book(patient, { p_visit_date: addDays(localToday(), 14) }),
    "invalid_visit_date",
  );
  refused(
    "a lab visit needs a day",
    await book(patient, { p_visit_date: null }),
    "invalid_visit_date",
  );

  section("Home collection bookings (LAB-03)");

  const home = (caller, fields = {}) =>
    book(caller, {
      p_collection: "home",
      p_visit_date: null,
      p_address_id: lahoreHome,
      ...fields,
    });
  refused(
    "home collection while it's off is refused",
    await home(patient, { p_slot_starts_at: new Date().toISOString() }),
    "not_collecting",
  );

  await rpc(lab, "save_lab_service_area", {
    p_id: null,
    p_city: "Lahore",
    p_fee: 300,
    p_note: null,
  });
  await rpc(lab, "save_lab_collection_schedule", {
    p_ranges: JSON.stringify(
      [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
        weekday,
        start: "00:00",
        end: "23:00",
      })),
    ),
    p_slot_minutes: 60,
    p_capacity: 2,
    p_notice_hours: 1,
    p_free_above: 3000,
    p_accepting: true,
  });
  const slots = async () =>
    (
      await rpc(patient, "get_lab_collection_slots", {
        p_lab_id: lab.id,
        p_days: 14,
      })
    ).data ?? [];
  denied(
    "a guest can't read collection windows, which count bookings",
    await rpc(null, "get_lab_collection_slots", {
      p_lab_id: lab.id,
      p_days: 14,
    }),
  );
  const [slot, nextSlot] = await slots();
  const spotsAt = async (startsAt) =>
    (await slots()).find(
      (item) =>
        new Date(item.starts_at).getTime() === new Date(startsAt).getTime(),
    )?.spots_left;

  const homeBooking = await home(patient, { p_slot_starts_at: slot.starts_at });
  succeeded("a patient books a home collection window", homeBooking);
  const homeRow = await bookingRow(idOf(homeBooking));
  check(
    "it copies the address and charges the city's fee",
    homeRow?.collection === "home" &&
      homeRow.city === "Lahore" &&
      homeRow.street_address === "House 1, Street 2" &&
      homeRow.contact_phone === "+92 300 1234567" &&
      homeRow.collection_fee === 300 &&
      homeRow.total === 1200 &&
      homeRow.care_recipient_relation === "self" &&
      new Date(homeRow.slot_starts_at).getTime() ===
        new Date(slot.starts_at).getTime(),
  );
  check("the window has one visit left", (await spotsAt(slot.starts_at)) === 1);

  const free = await home(patient, {
    p_lab_test_ids: [lipid, hba1c],
    p_slot_starts_at: nextSlot.starts_at,
  });
  check(
    "the fee is waived above the lab's amount",
    (await bookingRow(idOf(free)))?.collection_fee === 0 &&
      (await bookingRow(idOf(free))).total === 3700,
  );

  await home(secondPatient, {
    p_address_id: otherHome,
    p_slot_starts_at: slot.starts_at,
  });
  check("now it's full", (await spotsAt(slot.starts_at)) === 0);
  refused(
    "a full window is refused",
    await home(patient, { p_slot_starts_at: slot.starts_at }),
    "slot_full",
  );

  refused(
    "a time that isn't a window is refused",
    await home(patient, {
      p_slot_starts_at: new Date(
        Date.now() + 26 * 60 * MINUTE + 17 * 60_000,
      ).toISOString(),
    }),
    "slot_unavailable",
  );
  refused(
    "a test the lab doesn't collect at home is refused",
    await home(patient, {
      p_lab_test_ids: [urine],
      p_slot_starts_at: nextSlot.starts_at,
    }),
    "no_home_collection",
  );
  refused(
    "someone else's address is refused",
    await home(patient, {
      p_address_id: otherHome,
      p_slot_starts_at: nextSlot.starts_at,
    }),
    "invalid_address",
  );
  refused(
    "a city the lab doesn't collect in is refused",
    await home(patient, {
      p_address_id: karachiHome,
      p_slot_starts_at: nextSlot.starts_at,
    }),
    "area_not_served",
  );

  section("Who reads lab bookings (LAB-03, PRV-03)");

  const read = async (caller, table = "lab_bookings") =>
    (await as(caller, `select id from public.${table}`)).data ?? [];
  const otherLab = await createLab({ status: "approved" });
  check(
    "the patient reads their bookings and items",
    (await read(patient)).some((row) => row.id === visitId) &&
      (await read(patient, "lab_booking_items")).length >= 2,
  );
  check(
    "the lab reads its bookings",
    (await read(lab)).some((row) => row.id === visitId),
  );
  check(
    "another patient and another lab read none of them",
    !(await read(secondPatient)).some((row) => row.id === visitId) &&
      (await read(otherLab)).length === 0 &&
      (await read(otherLab, "lab_booking_items")).length === 0,
  );
  check(
    "a lab without two-factor reads nothing",
    (await read({ ...lab, aal: "aal1" })).length === 0,
  );
  denied(
    "a guest reads nothing",
    await as(null, `select id from public.lab_bookings`),
  );
  const write = await as(
    patient,
    `update public.lab_bookings set total = 1 where id = $1`,
    [visitId],
  );
  denied("nobody writes directly", write);

  const notices = async (userId, kind) =>
    (
      await db.query(
        `select href from public.notifications where user_id = $1 and kind = $2`,
        [userId, kind],
      )
    ).rows;
  check(
    "the patient and the lab get a notice",
    (await notices(patient.id, "lab_booking_booked"))[0]?.href ===
      "/patient/lab-tests" &&
      (await notices(lab.id, "lab_booking_new"))[0]?.href === "/lab/bookings",
  );

  section("Moving a lab booking along (LAB-04)");

  const move = (caller, id, from, to, fields = {}) =>
    rpc(caller, "move_lab_booking", {
      p_booking_id: id,
      p_from_status: from,
      p_to_status: to,
      p_reason: null,
      p_note: null,
      ...fields,
    });
  const eventsOf = async (id) =>
    (
      await db.query(
        `select status, reason, note, changed_by from public.lab_booking_events
         where booking_id = $1 order by created_at, id`,
        [id],
      )
    ).rows;
  const kindsFor = async (userId) =>
    (
      await db.query(
        `select kind from public.notifications where user_id = $1`,
        [userId],
      )
    ).rows.map((row) => row.kind);

  const visitEvents = await eventsOf(visitId);
  check(
    "a new booking starts its history as booked, by the patient",
    visitEvents.length === 1 &&
      visitEvents[0].status === "booked" &&
      visitEvents[0].changed_by === patient.id,
  );
  denied(
    "a guest can't move a booking",
    await move(null, visitId, "booked", "cancelled"),
  );
  refused(
    "a patient can't move a booking",
    await move(patient, visitId, "booked", "cancelled", {
      p_reason: "patient_request",
    }),
    "not_lab",
  );
  refused(
    "another lab can't move it",
    await move(otherLab, visitId, "booked", "cancelled", {
      p_reason: "patient_request",
    }),
    "booking_not_found",
  );
  refused(
    "a sample can't be collected before the booked day",
    await move(lab, visitId, "booked", "sample_collected"),
    "too_early",
  );
  refused(
    "a booking without a status to move from is refused",
    await move(lab, visitId, null, "sample_collected"),
    "invalid_move",
  );

  const todayId = idOf(await book(patient, { p_visit_date: localToday() }));
  refused(
    "steps can't be skipped",
    await move(lab, todayId, "booked", "processing"),
    "invalid_move",
  );
  refused(
    "a move from a status the booking isn't in is refused",
    await move(lab, todayId, "processing", "report_ready"),
    "status_changed",
  );
  check(
    "a lab without two-factor can't move it",
    (await move({ ...lab, aal: "aal1" }, todayId, "booked", "sample_collected"))
      .error?.message === "second_factor_required",
  );
  succeeded(
    "on the day, the lab marks the sample collected",
    await move(lab, todayId, "booked", "sample_collected"),
  );
  refused(
    "a second click on the same step is refused",
    await move(lab, todayId, "booked", "sample_collected"),
    "status_changed",
  );
  refused(
    "a forward move takes no reason",
    await move(lab, todayId, "sample_collected", "processing", {
      p_reason: "other",
    }),
    "invalid_reason",
  );
  refused(
    "a forward move takes no note",
    await move(lab, todayId, "sample_collected", "processing", {
      p_note: "Done",
    }),
    "invalid_note",
  );
  refused(
    "asking for a new sample needs a reason",
    await move(lab, todayId, "sample_collected", "recollection_needed"),
    "reason_required",
  );
  refused(
    "a cancel reason doesn't fit a new sample",
    await move(lab, todayId, "sample_collected", "recollection_needed", {
      p_reason: "patient_request",
    }),
    "invalid_reason",
  );
  refused(
    "'other' needs a note",
    await move(lab, todayId, "sample_collected", "recollection_needed", {
      p_reason: "other",
      p_note: "  ",
    }),
    "note_required",
  );
  refused(
    "a note of only line breaks and tabs counts as none",
    await move(lab, todayId, "sample_collected", "recollection_needed", {
      p_reason: "other",
      p_note: "\n\t\r\n",
    }),
    "note_required",
  );
  refused(
    "a note over 500 characters is refused",
    await move(lab, todayId, "sample_collected", "recollection_needed", {
      p_reason: "other",
      p_note: "x".repeat(501),
    }),
    "invalid_note",
  );
  succeeded(
    "the lab asks for a new sample with a reason and a note",
    await move(lab, todayId, "sample_collected", "recollection_needed", {
      p_reason: "sample_haemolysed",
      p_note: "Please come in the morning.\r\nNo need to fast.",
    }),
  );
  const recollect = await bookingRow(todayId);
  check(
    "the booking shows the reason and the note, line breaks normalised",
    recollect.status === "recollection_needed" &&
      recollect.status_reason === "sample_haemolysed" &&
      recollect.status_note === "Please come in the morning.\nNo need to fast.",
  );
  for (const [from, to] of [
    ["recollection_needed", "sample_collected"],
    ["sample_collected", "processing"],
  ]) {
    succeeded(
      `the lab moves it from ${from} to ${to}`,
      await move(lab, todayId, from, to),
    );
  }

  section("Publishing a lab report (LAB-05)");

  // A report at the path the app makes, recorded as checked the way the
  // server does after verifyUpload passes it.
  const checkedReport = async (owner, bookingId, extension = "pdf") => {
    const path = `${owner.id}/${bookingId}/${randomUUID()}.${extension}`;
    await rpc({ role: "service_role" }, "mark_upload_checked", {
      p_bucket: "lab-reports",
      p_path: path,
      p_owner_id: owner.id,
    });
    return path;
  };
  const publish = (caller, id, path) =>
    rpc(caller, "publish_lab_report", { p_booking_id: id, p_path: path });
  const reportsOf = async (id) =>
    (
      await db.query(
        `select id, version, storage_path, uploaded_by, replaced_at
         from public.lab_reports where booking_id = $1`,
        [id],
      )
    ).rows;

  refused(
    "report ready can't be marked without a report",
    {
      ...(await move(lab, todayId, "processing", "report_ready")),
      fn: "require_lab_report",
    },
    "report_required",
  );
  const reportPath = await checkedReport(lab, todayId);
  denied(
    "a guest can't publish a report",
    await publish(null, todayId, reportPath),
  );
  refused(
    "a patient can't publish a report",
    await publish(patient, todayId, reportPath),
    "not_lab",
  );
  refused(
    "another lab can't publish to this booking",
    await publish(otherLab, todayId, await checkedReport(otherLab, todayId)),
    "booking_not_found",
  );
  refused(
    "a booking not yet being processed can't take a report",
    await publish(lab, visitId, await checkedReport(lab, visitId)),
    "status_changed",
  );
  refused(
    "a report filed under another booking is refused",
    await publish(lab, todayId, await checkedReport(lab, visitId)),
    "invalid_path",
  );
  refused(
    "only a PDF is taken",
    await publish(lab, todayId, await checkedReport(lab, todayId, "jpg")),
    "invalid_path",
  );
  refused(
    "a file the server didn't check is refused",
    await publish(lab, todayId, `${lab.id}/${todayId}/${randomUUID()}.pdf`),
    "upload_not_checked",
  );
  check(
    "a lab without two-factor can't publish",
    (await publish({ ...lab, aal: "aal1" }, todayId, reportPath)).error
      ?.message === "second_factor_required",
  );
  const published = await publish(lab, todayId, reportPath);
  succeeded("the lab publishes the report", published);
  const [report] = await reportsOf(todayId);
  check(
    "the report is filed as the booking's first version, by the lab",
    report?.id === published.data?.[0]?.publish_lab_report &&
      report.version === 1 &&
      report.storage_path === reportPath &&
      report.uploaded_by === lab.id &&
      report.replaced_at === null,
  );
  refused(
    "a second click doesn't publish twice",
    await publish(lab, todayId, await checkedReport(lab, todayId)),
    "status_changed",
  );
  check(
    "publishing is audited, ids only",
    (
      await db.query(
        `select details from public.audit_log
         where action = 'lab_report.published' and target_id = $1`,
        [todayId],
      )
    ).rows[0]?.details?.report_id === report?.id,
  );
  const reportsSeenBy = async (caller) =>
    (
      await as(
        caller,
        `select count(*)::int as n from public.lab_reports where booking_id = $1`,
        [todayId],
      )
    ).data?.[0]?.n ?? 0;
  check(
    "the patient and the lab read the report; others don't",
    (await reportsSeenBy(patient)) === 1 &&
      (await reportsSeenBy(lab)) === 1 &&
      (await reportsSeenBy(secondPatient)) === 0 &&
      (await reportsSeenBy(otherLab)) === 0 &&
      (await reportsSeenBy({ ...lab, aal: "aal1" })) === 0,
  );
  denied(
    "nobody files a report directly",
    await as(
      lab,
      `insert into public.lab_reports (booking_id, lab_id, patient_id, care_recipient_id, storage_path)
       select id, lab_id, patient_id, care_recipient_id, $2 from public.lab_bookings where id = $1`,
      [visitId, `${lab.id}/${visitId}/${randomUUID()}.pdf`],
    ),
  );

  const ready = await bookingRow(todayId);
  check(
    "a forward move clears the reason and note",
    ready.status === "report_ready" &&
      ready.status_reason === null &&
      ready.status_note === null,
  );
  const history = await eventsOf(todayId);
  check(
    "every move is kept in order, by the lab",
    history.map((event) => event.status).join() ===
      "booked,sample_collected,recollection_needed,sample_collected,processing,report_ready" &&
      history.slice(1).every((event) => event.changed_by === lab.id) &&
      history[2].reason === "sample_haemolysed",
  );
  await db.query(
    `update public.lab_bookings set status = status, status_note = null where id = $1`,
    [todayId],
  );
  check(
    "writing the same status again adds no history",
    (await eventsOf(todayId)).length === 6,
  );
  refused(
    "a finished booking can't move again",
    await move(lab, todayId, "report_ready", "cancelled", {
      p_reason: "other",
      p_note: "Mistake",
    }),
    "invalid_move",
  );
  const patientKinds = await kindsFor(patient.id);
  check(
    "the patient gets a notice at each step",
    [
      "lab_booking_sample_collected",
      "lab_booking_recollection_needed",
      "lab_booking_processing",
      "lab_booking_report_ready",
    ].every((kind) => patientKinds.includes(kind)),
  );
  check(
    "the lab gets no notice for its own moves",
    !(await kindsFor(lab.id)).some((kind) =>
      ["lab_booking_sample_collected", "lab_booking_report_ready"].includes(
        kind,
      ),
    ),
  );

  const homeId = idOf(homeBooking);
  succeeded(
    "the lab cancels a home collection the patient phoned about",
    await move(lab, homeId, "booked", "cancelled", {
      p_reason: "patient_request",
    }),
  );
  check(
    "cancelling frees a visit in the window",
    (await spotsAt(slot.starts_at)) === 1,
  );
  check(
    "the patient is told it was cancelled",
    (await kindsFor(patient.id)).includes("lab_booking_cancelled"),
  );
  refused(
    "a cancelled booking can't move again",
    await move(lab, homeId, "cancelled", "sample_collected"),
    "invalid_move",
  );

  const historySeenBy = async (caller) =>
    (
      await as(
        caller,
        `select count(*)::int as n from public.lab_booking_events where booking_id = $1`,
        [todayId],
      )
    ).data?.[0]?.n ?? 0;
  check(
    "the patient and the lab read the history; others don't",
    (await historySeenBy(patient)) === 6 &&
      (await historySeenBy(lab)) === 6 &&
      (await historySeenBy(secondPatient)) === 0 &&
      (await historySeenBy(otherLab)) === 0 &&
      (await historySeenBy({ ...lab, aal: "aal1" })) === 0,
  );
  denied(
    "nobody writes the history directly",
    await as(
      lab,
      `insert into public.lab_booking_events (booking_id, lab_id, patient_id, status)
       values ($1, $2, $3, 'report_ready')`,
      [visitId, lab.id, patient.id],
    ),
  );

  section("What bookings hold on to (LAB-03)");

  refused(
    "a booked package can't be deleted",
    await rpc(lab, "delete_lab_package", { p_package_id: sugarPackage }),
    "package_has_bookings",
  );
  refused(
    "a family member with lab bookings can't be removed",
    await rpc(patient, "delete_family_member", { p_id: child }),
    "family_member_has_records",
  );

  const busy = await createPatient();
  let opened = 0;
  for (let i = 0; i < 20; i++) {
    if (!(await book(busy)).error) opened++;
  }
  check("an account can hold 20 open bookings", opened === 20);
  refused("the 21st is refused", await book(busy), "too_many_bookings");
  await db.query(
    `update public.lab_bookings set visit_date = visit_date - 30 where patient_id = $1`,
    [busy.id],
  );
  succeeded(
    "bookings left on past days don't count against the limit",
    await book(busy),
  );

  const gone = await createPatient();
  await book(gone);
  const goneReported = idOf(
    await book(gone, { p_visit_date: localToday() }),
  );
  for (const [from, to] of [
    ["booked", "sample_collected"],
    ["sample_collected", "processing"],
  ]) {
    await move(lab, goneReported, from, to);
  }
  succeeded(
    "a report is published for the account about to go",
    await publish(lab, goneReported, await checkedReport(lab, goneReported)),
  );
  const goneError = await db
    .query(`delete from auth.users where id = $1`, [gone.id])
    .then(
      () => null,
      (error) => error.message,
    );
  check(
    "deleting an account removes its bookings and reports",
    goneError === null &&
      (
        await db.query(
          `select ((select count(*) from public.lab_bookings where patient_id = $1)
             + (select count(*) from public.lab_reports where patient_id = $1))::int as n`,
          [gone.id],
        )
      ).rows[0].n === 0,
    goneError ?? "",
  );

  const labGone = await db
    .query(`delete from auth.users where id = $1`, [lab.id])
    .then(
      () => null,
      (error) => error.message,
    );
  check(
    "a lab with bookings can delete its account, taking its bookings and reports",
    labGone === null &&
      (
        await db.query(
          `select ((select count(*) from public.lab_bookings where lab_id = $1)
             + (select count(*) from public.lab_reports where lab_id = $1))::int as n`,
          [lab.id],
        )
      ).rows[0].n === 0,
    labGone ?? "",
  );
}

async function testFamilyMembers({ patient, secondPatient }) {
  section("Adding family members (PRO-03)");

  const doctor = await createDoctor();
  const member = (fields = {}) => ({
    p_id: null,
    p_first_name: " Ali ",
    p_last_name: "Patient",
    p_relation: "child",
    p_date_of_birth: "2019-04-02",
    p_allergies: ["Peanuts", " Peanuts ", "", "Dust"],
    ...fields,
  });
  const save = (caller, fields) =>
    rpc(caller, "save_family_member", member(fields));
  const recipient = async (id) =>
    (await db.query(`select * from public.care_recipients where id = $1`, [id]))
      .rows[0];

  const added = await save(patient);
  const childId = added.data?.[0]?.save_family_member;
  const child = childId && (await recipient(childId));
  check(
    "a patient adds a family member",
    child?.account_id === patient.id &&
      child?.relation === "child" &&
      child?.first_name === "Ali",
    added.error?.message,
  );
  check(
    "their lists are cleaned like the patient's own",
    child?.allergies?.join("|") === "Peanuts|Dust",
    JSON.stringify(child?.allergies),
  );

  succeeded(
    "the patient edits them",
    await save(patient, {
      p_id: childId,
      p_first_name: "Aliya",
      p_relation: "child",
      p_blood_group: "B+",
    }),
  );
  check(
    "the edit is saved",
    (await recipient(childId))?.first_name === "Aliya" &&
      (await recipient(childId))?.blood_group === "B+",
  );

  refused("a doctor can't add one", await save(doctor), "not_patient");
  refused(
    "nobody is added as a second self",
    await save(patient, { p_relation: "self" }),
    "invalid_relation",
  );
  refused(
    "a date of birth is required",
    await save(patient, { p_date_of_birth: null }),
    "invalid_date_of_birth",
  );
  refused(
    "a birth date in the future is refused",
    await save(patient, { p_date_of_birth: "2999-01-01" }),
    "invalid_date_of_birth",
  );
  refused(
    "a blank name is refused",
    await save(patient, { p_first_name: "  " }),
    "invalid_profile",
  );
  refused(
    "an unknown blood group is refused",
    await save(patient, { p_blood_group: "C+" }),
    "invalid_profile",
  );
  refused(
    "a list item over 100 characters is refused",
    await save(patient, { p_allergies: ["x".repeat(101)] }),
    "invalid_profile",
  );

  const selfId = (
    await db.query(
      `select id from public.care_recipients where account_id = $1 and relation = 'self'`,
      [patient.id],
    )
  ).rows[0].id;
  refused(
    "the account holder's own row isn't edited here",
    await save(patient, { p_id: selfId }),
    "family_member_not_found",
  );
  refused(
    "another account's family member can't be edited",
    await save(secondPatient, { p_id: childId }),
    "family_member_not_found",
  );
  check(
    "another patient doesn't see them",
    (
      await as(
        secondPatient,
        `select id from public.care_recipients where id = $1`,
        [childId],
      )
    ).data?.length === 0,
  );

  const crowded = await createPatient();
  for (let i = 0; i < 10; i++) await save(crowded, { p_first_name: `Kid${i}` });
  refused(
    "an account holds ten family members at most",
    await save(crowded),
    "too_many_family_members",
  );

  section("Booking for a family member (APT-09, FIX-15)");

  const slots = await slotsOf(doctor.id);
  const book = (caller, slot, recipientId) =>
    rpc(caller, "book_appointment", {
      p_doctor_id: doctor.id,
      p_starts_at: slot.starts_at,
      p_care_recipient_id: recipientId,
    });

  const own = await book(patient, slots[0], null);
  const ownRow = own.data?.[0]?.book_appointment;
  check(
    "a booking without a person is for the account holder",
    ownRow?.care_recipient_id === selfId &&
      ownRow?.care_recipient_relation === "self" &&
      ownRow?.care_recipient_name === ownRow?.patient_name,
    own.error?.message,
  );

  const forChild = await book(patient, slots[2], childId);
  const childRow = forChild.data?.[0]?.book_appointment;
  check(
    "a parent books their child with the same doctor",
    childRow?.care_recipient_id === childId,
    forChild.error?.message,
  );
  check(
    "the booking names the child and keeps the parent as contact",
    childRow?.care_recipient_name === "Aliya Patient" &&
      childRow?.care_recipient_relation === "child" &&
      childRow?.patient_name === ownRow?.patient_name,
  );
  refused(
    "the child can't hold two upcoming visits with one doctor",
    await book(patient, slots[4], childId),
    "already_booked_with_doctor",
  );
  // Same time, another doctor: the account holder can't be on two calls.
  const otherDoctor = await createDoctor();
  const sara = (await save(patient, { p_first_name: "Sara" })).data?.[0]
    ?.save_family_member;
  refused(
    "two visits on one account can't overlap",
    await rpc(patient, "book_appointment", {
      p_doctor_id: otherDoctor.id,
      p_starts_at: slots[0].starts_at,
      p_care_recipient_id: sara,
    }),
    "patient_time_conflict",
  );
  refused(
    "nobody books for another account's family member",
    await book(secondPatient, slots[6], childId),
    "invalid_care_recipient",
  );

  check(
    "the doctor reads the child's medical profile",
    (
      await as(doctor, `select id from public.care_recipients where id = $1`, [
        childId,
      ])
    ).data?.length === 1,
  );

  const childVisit = await createAppointment(doctor, patient, {
    from: -30,
    to: 0,
  });
  await db.query(
    `update public.appointments
     set care_recipient_id = $1, care_recipient_name = 'Aliya Patient', care_recipient_relation = 'child'
     where id = $2`,
    [childId, childVisit],
  );
  const rx = issued(await issue(doctor, childVisit));
  check(
    "the prescription names the child",
    rx?.care_recipient_name === "Aliya Patient" &&
      rx?.care_recipient_relation === "child" &&
      rx?.care_recipient_id === childId,
  );

  section("Removing family members (PRO-03)");

  refused(
    "someone with records can't be removed",
    await rpc(patient, "delete_family_member", { p_id: childId }),
    "family_member_has_records",
  );
  refused(
    "a doctor can't remove one",
    await rpc(doctor, "delete_family_member", { p_id: childId }),
    "not_patient",
  );
  refused(
    "another account can't remove them",
    await rpc(secondPatient, "delete_family_member", { p_id: childId }),
    "family_member_not_found",
  );
  refused(
    "the account holder's own row can't be removed",
    await rpc(patient, "delete_family_member", { p_id: selfId }),
    "family_member_not_found",
  );

  const spare = (await save(patient, { p_first_name: "Spare" })).data?.[0]
    ?.save_family_member;
  succeeded(
    "someone with no records is removed",
    await rpc(patient, "delete_family_member", { p_id: spare }),
  );
  check("they're gone", (await recipient(spare)) === undefined);
}

async function testPatientProfile({ patient, secondPatient }) {
  section("Saving the medical profile (PRO-01)");

  const doctor = await createDoctor();
  const profileless = await createUser("patient");
  const profile = {
    p_first_name: "  Ali  ",
    p_last_name: "Raza",
    p_phone: "+92 300 1234567",
    p_date_of_birth: "1990-05-01",
    p_gender: "Male",
    p_blood_group: "B+",
    p_height_cm: 175,
    p_weight_kg: 72.5,
    p_allergies: [" Penicillin ", "", "Peanuts", "Penicillin"],
    p_chronic_conditions: ["Asthma"],
    p_current_medicines: [],
    p_home_address: " House 12, Lahore ",
    p_emergency_contact_name: "Sara Raza",
    p_emergency_contact_phone: "+92 301 7654321",
  };
  const save = (caller, fields = {}) =>
    rpc(caller, "save_patient_profile", { ...profile, ...fields });
  const saved = async (accountId) => ({
    ...(
      await db.query(`select * from public.patient_profiles where id = $1`, [
        accountId,
      ])
    ).rows[0],
    medical: (
      await db.query(
        `select * from public.care_recipients
         where account_id = $1 and relation = 'self'`,
        [accountId],
      )
    ).rows[0],
  });

  denied("a guest can't save a profile", await save(null));
  refused("a doctor can't save one", await save(doctor), "not_patient");
  refused(
    "an account with no profile row can't",
    await save(profileless),
    "not_patient",
  );

  succeeded("a patient saves their profile", await save(patient));
  const row = await saved(patient.id);
  check(
    "contact details are saved, trimmed",
    row.first_name === "Ali" &&
      row.home_address === "House 12, Lahore" &&
      row.emergency_contact_name === "Sara Raza",
  );
  check(
    "medical details are saved",
    row.medical.blood_group === "B+" &&
      row.medical.height_cm === 175 &&
      Number(row.medical.weight_kg) === 72.5 &&
      row.medical.date_of_birth !== null,
  );
  check(
    "lists are cleaned, keeping their order",
    row.medical.allergies.join() === "Penicillin,Peanuts",
  );

  await save(patient, {
    p_allergies: ["Penicillin", "PENICILLIN ", "penicillin"],
  });
  check(
    "repeats ignore case, keeping the first spelling",
    (await saved(patient.id)).medical.allergies.join() === "Penicillin",
  );
  await save(patient);
  check("the self row takes the new name", row.medical.first_name === "Ali");

  refused(
    "a birth date in the future is refused",
    await save(patient, { p_date_of_birth: "2999-01-01" }),
    "invalid_date_of_birth",
  );
  refused(
    "an impossible age is refused",
    await save(patient, { p_date_of_birth: "1800-01-01" }),
    "invalid_date_of_birth",
  );
  refused(
    "an overlong allergy is refused",
    await save(patient, { p_allergies: ["x".repeat(101)] }),
    "invalid_profile",
  );

  const invalid = {
    "a blood group that doesn't exist": { p_blood_group: "C+" },
    "an unknown gender": { p_gender: "Unknown" },
    "an impossible height": { p_height_cm: 900 },
    "a height too big to store": { p_height_cm: 90000 },
    "an impossible weight": { p_weight_kg: 900 },
    "a blank name": { p_first_name: "   " },
    "too short a phone number": { p_phone: "123" },
    "too long an address": { p_home_address: "a".repeat(301) },
    "a very long list": {
      p_allergies: Array.from({ length: 31 }, (_, index) => `Item ${index}`),
    },
  };
  for (const [label, fields] of Object.entries(invalid)) {
    refused(
      `${label} is refused`,
      await save(patient, fields),
      "invalid_profile",
    );
  }

  const unchanged = await saved(patient.id);
  check(
    "a refused save changes nothing, in either table",
    unchanged.first_name === "Ali" && unchanged.medical.blood_group === "B+",
  );

  succeeded(
    "details can be cleared",
    await save(patient, {
      p_date_of_birth: null,
      p_blood_group: null,
      p_allergies: [],
      p_home_address: "   ",
    }),
  );
  const cleared = await saved(patient.id);
  check(
    "cleared details are empty",
    cleared.medical.blood_group === null &&
      cleared.medical.allergies.length === 0 &&
      cleared.home_address === null,
  );

  await save(secondPatient, { p_first_name: "Other" });
  check(
    "a save reaches only the caller's own row",
    (await saved(patient.id)).first_name === "Ali",
  );
}

// Production already has rows, so run the same upgrade over rows the old schema
// allowed. The tests above can't see a backfill: they start from nothing.
async function testUpgrade() {
  section("Upgrading a database that has data (PRO-03)");

  const older = await createOlderDatabase(
    "20261030120000_doctor_verification.sql",
  );
  const run = (sql, params) => older.db.query(sql, params);

  const addUser = async (role) =>
    (
      await run(
        `insert into auth.users (email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
         values ($1, now(), $2, $3) returning id`,
        [
          `${randomUUID()}@example.invalid`,
          { role },
          { full_name: "Old Account Name" },
        ],
      )
    ).rows[0].id;

  const doctorId = await addUser("doctor");
  await run(
    `insert into public.doctor_profiles (
       id, first_name, last_name, phone, age, gender, specialization,
       license_number, clinic_address
     ) values ($1, 'Old', 'Doctor', '+92 300 0000000', 40, 'Other', 'x', 'x', 'x')`,
    [doctorId],
  );

  const withProfile = await addUser("patient");
  await run(
    `insert into public.patient_profiles (id, first_name, last_name, phone)
     values ($1, 'Old', 'Patient', '+92 300 0000000')`,
    [withProfile],
  );
  const noProfile = await addUser("patient");
  const neverBooked = await addUser("patient");
  await run(
    `insert into public.patient_profiles (id, first_name, last_name, phone)
     values ($1, 'Never', 'Booked', '+92 300 0000000')`,
    [neverBooked],
  );

  const oldVisit = async (patientId, hoursAgo) =>
    (
      await run(
        `insert into public.appointments (
           doctor_id, patient_id, starts_at, ends_at, doctor_name,
           doctor_specialization, consultation_fee, timezone, patient_name, patient_email
         ) values ($1, $2, now() - make_interval(hours => $3::int),
           now() - make_interval(hours => $3::int) + interval '30 minutes',
           'x', 'x', 0, 'UTC', 'x', 'x') returning id, updated_at`,
        [doctorId, patientId, hoursAgo],
      )
    ).rows[0];

  const firstVisit = await oldVisit(withProfile, 5);
  await oldVisit(noProfile, 7);
  await run(
    `insert into public.prescriptions (
       appointment_id, doctor_id, patient_id, doctor_name, doctor_specialization,
       doctor_license, clinic_address, patient_name, timezone
     ) values ($1, $2, $3, 'x', 'x', 'x', 'x', 'x', 'UTC')`,
    [firstVisit.id, doctorId, withProfile],
  );

  const labId = await addUser("lab");
  await run(
    `insert into public.lab_profiles (id, lab_name, registration_number, contact_person, phone, address)
     values ($1, 'Old Lab', 'x', 'x', '+92 300 0000000', 'x')`,
    [labId],
  );

  let upgraded = true;
  try {
    await older.upgrade();
  } catch (error) {
    upgraded = false;
    check("the upgrade applies over existing rows", false, error.message);
  }

  if (upgraded) {
    check("the upgrade applies over existing rows", true);

    const { rows: selves } = await run(
      `select account_id, first_name, last_name from public.care_recipients
       where relation = 'self'`,
    );
    const selfOf = (id) => selves.find((row) => row.account_id === id);
    check(
      "every patient gets a self row, even with no bookings",
      selves.length === 3 && Boolean(selfOf(neverBooked)),
    );
    check(
      "the name comes from their profile",
      selfOf(withProfile)?.first_name === "Old" &&
        selfOf(withProfile)?.last_name === "Patient",
    );
    check(
      "an account with no profile falls back to its account name",
      selfOf(noProfile)?.first_name === "Old" &&
        selfOf(noProfile)?.last_name === "Account Name",
    );

    const { rows: missing } = await run(
      `select
         (select count(*) from public.appointments where care_recipient_id is null) as visits,
         (select count(*) from public.prescriptions where care_recipient_id is null) as prescriptions`,
    );
    check(
      "no old record is left without a recipient",
      Number(missing[0].visits) === 0 && Number(missing[0].prescriptions) === 0,
    );

    const { rows: after } = await run(
      `select updated_at from public.appointments where id = $1`,
      [firstVisit.id],
    );
    check(
      "the backfill doesn't look like an edit",
      after[0].updated_at.getTime() === firstVisit.updated_at.getTime(),
    );

    const { rows: triggers } = await run(
      `select count(*) as off from pg_trigger
       where tgname = 'set_updated_at' and tgenabled = 'D'`,
    );
    check("no trigger is left switched off", Number(triggers[0].off) === 0);

    const { rows: labs } = await run(
      `select l.verification_status, exists (
         select 1 from public.lab_directory d where d.id = l.id
       ) as listed
       from public.lab_profiles l where l.id = $1`,
      [labId],
    );
    check(
      "an existing lab waits for review and isn't listed (ADM-04)",
      labs[0]?.verification_status === "pending" && labs[0]?.listed === false,
    );
  }

  await older.db.close();
}

async function testSecondFactor({ patient, secondPatient }) {
  section("Doctors and labs need a second factor (AUTH-06, SEC-03)");

  const doctor = await createDoctor();
  const passwordOnly = { ...doctor, aal: "aal1" };
  const visit = await startedVisit(doctor, patient);
  const upcoming = await createAppointment(doctor, patient, { from: 300 });
  await issue(doctor, visit);

  const rows = async (caller, sql) => (await as(caller, sql)).data?.length ?? 0;
  const tables = [
    "appointments",
    "prescriptions",
    "prescription_items",
    "appointment_notes",
  ];

  await db.query(
    `insert into public.appointment_notes (appointment_id, doctor_id, notes)
     values ($1, $2, 'private')`,
    [visit, doctor.id],
  );

  for (const table of tables) {
    const sql = `select 1 from public.${table}`;
    check(
      `with two-factor a doctor reads ${table}`,
      (await rows(doctor, sql)) > 0,
    );
    check(
      `with only a password they read nothing from ${table}`,
      (await rows(passwordOnly, sql)) === 0,
    );
  }

  const blocked = (label, result) =>
    refused(
      label,
      { ...result, fn: "require_second_factor" },
      "second_factor_required",
    );
  blocked(
    "a password alone can't prescribe",
    await issue(passwordOnly, visit, {
      p_replaces_id: (
        await db.query(
          `select id from public.prescriptions where appointment_id = $1 and status = 'active'`,
          [visit],
        )
      ).rows[0]?.id,
    }),
  );
  blocked(
    "a password alone can't cancel a visit",
    await rpc(passwordOnly, "cancel_appointment", {
      p_appointment_id: upcoming,
    }),
  );
  blocked(
    "a password alone can't change the schedule",
    await rpc(passwordOnly, "save_doctor_schedule", {
      p_ranges: [],
      p_slot_minutes: 30,
      p_accepting: true,
      p_fee: 1000,
    }),
  );
  check("the schedule is untouched", (await hoursOf(doctor.id)).length === 7);
  blocked(
    "a password alone can't write a note",
    await as(
      passwordOnly,
      `update public.appointment_notes set notes = 'x' where appointment_id = $1`,
      [visit],
    ),
  );

  const call = await createAppointment(doctor, patient, { from: 2, to: 32 });
  const topic = { p_topic: `call:${call}` };
  check(
    "with two-factor a doctor joins the call",
    (await rpc(doctor, "can_join_call", topic)).data?.[0]?.can_join_call ===
      true,
  );
  check(
    "with only a password they can't",
    (await rpc(passwordOnly, "can_join_call", topic)).data?.[0]
      ?.can_join_call === false,
  );

  const newDoctor = await createDoctor({ status: "pending" });
  succeeded(
    "a new doctor's documents aren't clinical data, so they aren't blocked",
    await rpc({ ...newDoctor, aal: "aal1" }, "save_verification_documents", {
      p_license_path: await checkedDoctorFile(newDoctor.id, "license"),
    }),
  );

  const lab = { ...(await createUser("lab")), aal: "aal1" };
  check(
    "a lab with only a password fails the same check",
    (await as(lab, `select private.second_factor_ok() as ok`).catch(() => null))
      ?.data?.[0]?.ok === false,
  );

  section("Patients choose (AUTH-06)");

  check(
    "a patient without two-factor reads their visits with a password",
    (await rows(secondPatient, `select 1 from public.care_recipients`)) === 1,
  );

  await db.query(
    `insert into auth.mfa_factors (user_id, status) values ($1, 'unverified')`,
    [secondPatient.id],
  );
  check(
    "a half-finished pairing changes nothing",
    (await rows(secondPatient, `select 1 from public.care_recipients`)) === 1,
  );

  await db.query(
    `update auth.mfa_factors set status = 'verified' where user_id = $1`,
    [secondPatient.id],
  );
  check(
    "once it's on, a password alone reads nothing",
    (await rows(secondPatient, `select 1 from public.care_recipients`)) === 0,
  );
  blocked(
    "and writes nothing",
    await rpc(secondPatient, "save_patient_profile", {
      p_first_name: "Blocked",
      p_last_name: "Patient",
      p_phone: "+92 300 0000000",
    }),
  );
  check(
    "with the second factor they read normally",
    (await rows(
      { ...secondPatient, aal: "aal2" },
      `select 1 from public.care_recipients`,
    )) === 1,
  );

  const job = { role: "service_role" };
  check(
    "server jobs have no user and aren't affected",
    (await rows(job, `select 1 from public.appointments`)) > 0,
  );
  succeeded(
    "sign-up with the secret key still creates a profile",
    await as(
      job,
      `update public.patient_profiles set phone = phone where id = $1`,
      [patient.id],
    ),
  );
}

async function testRecoveryCodes({ patient, secondPatient }) {
  section("Recovery codes (AUTH-06)");

  const server = { role: "service_role" };
  const auditFor = async (id, action) =>
    Number(
      (
        await db.query(
          `select count(*) as n from public.audit_log where actor_id = $1 and action = $2`,
          [id, action],
        )
      ).rows[0].n,
    );
  const replace = (caller, userId, hashes) =>
    rpc(caller, "replace_recovery_codes", {
      p_user_id: userId,
      p_code_hashes: hashes,
    });
  const spend = (caller, userId, hash) =>
    rpc(caller, "use_recovery_code", { p_user_id: userId, p_code_hash: hash });
  const spent = (result) => result.data?.[0]?.use_recovery_code;

  denied("a guest can't create codes", await replace(null, patient.id, ["a"]));
  denied(
    "a signed-in user can't create codes",
    await replace(patient, patient.id, ["a"]),
  );
  denied(
    "a signed-in user can't spend a code",
    await spend(patient, patient.id, "a"),
  );
  denied(
    "signed-in users can't read the table",
    await as(patient, `select id from public.mfa_recovery_codes`),
  );
  refused(
    "an empty set of codes is refused",
    await replace(server, patient.id, []),
    "invalid_recovery_codes",
  );

  succeeded(
    "the server stores codes",
    await replace(server, patient.id, ["one", "two"]),
  );
  check(
    "a right code works",
    spent(await spend(server, patient.id, "one")) === true,
  );
  check(
    "it works only once",
    spent(await spend(server, patient.id, "one")) === false,
  );
  check(
    "a wrong code fails",
    spent(await spend(server, patient.id, "nope")) === false,
  );
  check(
    "someone else's code fails",
    spent(await spend(server, secondPatient.id, "two")) === false,
  );
  check(
    "each use is logged once",
    (await auditFor(patient.id, "mfa.recovery_code_used")) === 1,
  );

  succeeded(
    "new codes replace the old",
    await replace(server, patient.id, ["three"]),
  );
  check(
    "the old codes stop working",
    spent(await spend(server, patient.id, "two")) === false,
  );
  check(
    "creating them is logged",
    (await auditFor(patient.id, "mfa.recovery_codes_created")) === 2,
  );
}

async function testSecurityAudit({ patient }) {
  section("Security events (SEC-04)");

  const server = { role: "service_role" };
  const record = (caller, action, hash) =>
    rpc(caller, "record_security_event", {
      p_actor_id: patient.id,
      p_action: action,
      p_ip_hash: hash,
    });

  denied("a guest can't write events", await record(null, "auth.signed_in"));
  denied("a user can't forge events", await record(patient, "auth.signed_in"));
  refused(
    "an unknown event is refused",
    await record(server, "auth.made_up"),
    "invalid_event",
  );
  succeeded(
    "the server records a sign-in",
    await record(server, "auth.signed_in", "abc123"),
  );

  const { rows: logged } = await db.query(
    `select actor_role, target_id, details from public.audit_log
     where actor_id = $1 and action = 'auth.signed_in'`,
    [patient.id],
  );
  check(
    "it stores the role and a hashed IP, nothing else",
    logged[0]?.actor_role === "patient" &&
      logged[0]?.target_id === patient.id &&
      logged[0]?.details?.ip_hash === "abc123" &&
      Object.keys(logged[0]?.details ?? {}).length === 1,
  );

  section("Prescriptions in the audit log (SEC-04)");

  const doctor = await createDoctor();
  const visit = await startedVisit(doctor, patient);
  const first = issued(await issue(doctor, visit));
  const second = issued(
    await issue(doctor, visit, { p_replaces_id: first.id }),
  );
  await rpc(doctor, "cancel_prescription", {
    p_prescription_id: second.id,
    p_reason: TAG,
  });

  const { rows } = await db.query(
    `select action, actor_id, actor_role, details from public.audit_log
     where target_type = 'prescription' and target_id = any($1) order by id`,
    [[first.id, second.id]],
  );
  check(
    "issue, edit and cancel are each logged",
    rows.map((row) => row.action).join() ===
      "prescription.issued,prescription.replaced,prescription.cancelled",
    rows.map((row) => row.action).join(),
  );
  check(
    "each names the doctor who did it",
    rows.every(
      (row) => row.actor_id === doctor.id && row.actor_role === "doctor",
    ),
  );
  check(
    "no health details reach the log",
    rows.every((row) => Object.keys(row.details).length === 0),
  );
}

async function testRateLimits({ patient }) {
  section("Rate limits (AUTH-07, SEC-05)");

  const server = { role: "service_role" };
  const hit = (caller, bucket, limit = 3, seconds = 900) =>
    rpc(caller, "hit_rate_limit", {
      p_bucket: bucket,
      p_limit: limit,
      p_window_seconds: seconds,
    });
  const allowed = (result) => result.data?.[0]?.hit_rate_limit;

  denied("guests can't touch the counters", await hit(null, "x"));
  denied("users can't reset or read them", await hit(patient, "x"));
  denied(
    "the table is closed even to the secret key",
    await as(server, `select * from public.rate_limits`),
  );
  refused(
    "a limit of nothing is refused",
    await hit(server, "x", 0),
    "invalid_rate_limit",
  );

  const results = [];
  for (let attempt = 0; attempt < 5; attempt++) {
    results.push(allowed(await hit(server, "login:one")));
  }
  check(
    "the first three pass and the rest are stopped",
    results.join() === "true,true,true,false,false",
    results.join(),
  );
  check(
    "another bucket has its own count",
    allowed(await hit(server, "login:two")) === true,
  );

  await db.query(
    `update public.rate_limits set window_start = window_start - interval '1 hour'
     where bucket = 'login:one'`,
  );
  check(
    "a new window starts fresh",
    allowed(await hit(server, "login:one")) === true,
  );
}

async function testNotifications({ patient, secondPatient }) {
  section("Notifications (NTF-01, NTF-02)");

  const doctor = await createDoctor();
  const kinds = async (userId) =>
    (
      await db.query(
        `select kind from public.notifications where user_id = $1 order by created_at, id`,
        [userId],
      )
    ).rows.map((row) => row.kind);
  const hasKind = async (userId, kind) => (await kinds(userId)).includes(kind);

  const [slot] = await slotsOf(doctor.id);
  const booked = await rpc(patient, "book_appointment", {
    p_doctor_id: doctor.id,
    p_starts_at: slot.starts_at,
  });
  check(
    "a booking tells the patient",
    await hasKind(patient.id, "appointment_booked"),
  );
  check("and the doctor", await hasKind(doctor.id, "appointment_new"));

  await rpc(patient, "cancel_appointment", {
    p_appointment_id: booked.data[0].book_appointment.id,
  });
  check(
    "a patient cancelling tells the doctor",
    await hasKind(doctor.id, "appointment_cancelled"),
  );
  check(
    "and not the patient, who already knows",
    !(await hasKind(patient.id, "appointment_cancelled")),
  );

  const later = await createAppointment(doctor, patient, { from: 500 });
  await rpc(doctor, "cancel_appointment", { p_appointment_id: later });
  check(
    "a doctor cancelling tells the patient",
    await hasKind(patient.id, "appointment_cancelled"),
  );

  const visit = await startedVisit(doctor, patient);
  const first = issued(await issue(doctor, visit));
  check(
    "a prescription tells the patient",
    await hasKind(patient.id, "prescription_issued"),
  );
  const second = issued(
    await issue(doctor, visit, { p_replaces_id: first.id }),
  );
  check("so does an edit", await hasKind(patient.id, "prescription_updated"));
  await rpc(doctor, "cancel_prescription", {
    p_prescription_id: second.id,
    p_reason: TAG,
  });
  check(
    "and a cancellation",
    await hasKind(patient.id, "prescription_cancelled"),
  );

  const { rows: links } = await db.query(
    `select href from public.notifications where user_id = $1 and kind = 'prescription_cancelled'`,
    [patient.id],
  );
  check(
    "each links to its item",
    links[0]?.href === `/patient/prescriptions/${second.id}`,
  );

  const adminUser = { ...(await createUser("admin")), aal: "aal2" };
  for (const [decision, kind] of [
    ["approved", "verification_approved"],
    ["needs_info", "verification_needs_info"],
    ["rejected", "verification_rejected"],
  ]) {
    const reviewed = await createDoctor({ status: "pending", documents: true });
    await rpc(adminUser, "admin_review_doctor", {
      p_doctor_id: reviewed.id,
      p_decision: decision,
      p_submitted_at: null,
      p_note: TAG,
    });
    check(
      `a review tells the doctor: ${kind}`,
      await hasKind(reviewed.id, kind),
    );
  }

  section("Reading them (NTF-01)");

  const mine = `select id, read_at from public.notifications`;
  const unread = async (caller) =>
    (await as(caller, mine)).data?.filter((row) => !row.read_at) ?? [];
  const before = await unread(patient);
  check("a patient reads their own", before.length >= 5);
  check(
    "another patient reads none of them",
    (await as(secondPatient, mine)).data?.length === 0,
  );
  denied("guests read nothing", await as(null, mine));
  denied(
    "users can't write them directly",
    await as(
      patient,
      `update public.notifications set read_at = now() where user_id = $1`,
      [patient.id],
    ),
  );

  const mark = (caller, id) =>
    rpc(caller, "mark_notifications_read", { p_id: id });
  denied("a guest can't mark anything read", await mark(null, before[0].id));
  await mark(secondPatient, before[0].id);
  check(
    "marking someone else's does nothing",
    (await unread(patient)).length === before.length,
  );
  succeeded("a patient marks one read", await mark(patient, before[0].id));
  check(
    "one fewer is unread",
    (await unread(patient)).length === before.length - 1,
  );
  succeeded("and then all of them", await mark(patient, null));
  check("nothing is unread", (await unread(patient)).length === 0);

  const protectedPatient = await createPatient();
  await db.query(
    `insert into auth.mfa_factors (user_id, status) values ($1, 'verified')`,
    [protectedPatient.id],
  );
  refused(
    "a password alone can't touch a protected account's notifications",
    await mark(protectedPatient, null),
    "not_signed_in",
  );

  const { rows: published } = await db.query(
    `select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and tablename = 'notifications'`,
  );
  check("the bell gets live updates", published.length === 1);
}

async function testTimeOff({ patient }) {
  section("Doctor time off (APT-04)");

  const doctor = await createDoctor();
  const otherDoctor = await createDoctor();
  const passwordOnly = { ...doctor, aal: "aal1" };
  const day = (offset) =>
    new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);
  const add = (caller, from, to) =>
    rpc(caller, "add_doctor_time_off", { p_starts_on: from, p_ends_on: to });
  const remove = (caller, id) =>
    rpc(caller, "remove_doctor_time_off", { p_id: id });

  denied("a guest can't take time off", await add(null, day(5), day(6)));
  refused("a patient can't", await add(patient, day(5), day(6)), "not_doctor");
  refused(
    "a doctor account with no profile can't",
    await add(await createUser("doctor"), day(5), day(6)),
    "not_doctor",
  );
  refused(
    "the end can't be before the start",
    await add(doctor, day(6), day(5)),
    "invalid_time_off",
  );
  refused(
    "it can't start in the past",
    await add(doctor, day(-3), day(2)),
    "invalid_time_off",
  );
  refused(
    "it can't run past a year",
    await add(doctor, day(2), day(400)),
    "invalid_time_off",
  );
  refused(
    "a password alone can't",
    {
      ...(await add(passwordOnly, day(5), day(6))),
      fn: "require_second_factor",
    },
    "second_factor_required",
  );

  const slotDays = async (id) =>
    new Set(
      (await slotsOf(id)).map((slot) =>
        new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(
          slot.starts_at,
        ),
      ),
    );
  check("day 5 has slots first", (await slotDays(doctor.id)).has(day(5)));

  const booked = await createAppointment(doctor, patient, {
    from: 5 * 24 * 60,
  });
  const added = await add(doctor, day(5), day(6));
  succeeded("a doctor takes two days off", added);
  const id = added.data?.[0]?.add_doctor_time_off;

  const open = await slotDays(doctor.id);
  check("those days have no slots", !open.has(day(5)) && !open.has(day(6)));
  check("the days around them do", open.has(day(4)) && open.has(day(7)));
  check(
    "another doctor is unaffected",
    (await slotDays(otherDoctor.id)).has(day(5)),
  );
  check(
    "an existing booking stays until the doctor acts",
    (await appointmentRow(booked)).status === "booked",
  );

  refused(
    "a booking on a day off is refused",
    await rpc(patient, "book_appointment", {
      p_doctor_id: doctor.id,
      p_starts_at: new Date(`${day(5)}T07:00:00Z`),
    }),
    "slot_unavailable",
  );
  refused(
    "time off can't overlap itself",
    await add(doctor, day(6), day(8)),
    "time_off_overlap",
  );

  const read = `select id from public.doctor_time_off`;
  check(
    "a doctor reads their own",
    (await as(doctor, read)).data?.length === 1,
  );
  check(
    "another doctor doesn't",
    (await as(otherDoctor, read)).data?.length === 0,
  );
  denied("guests don't", await as(null, read));

  refused(
    "another doctor can't remove it",
    await remove(otherDoctor, id),
    "time_off_not_found",
  );
  succeeded("the doctor removes it", await remove(doctor, id));
  check("the slots return", (await slotDays(doctor.id)).has(day(5)));
}

async function reminderVisit(
  doctor,
  minutes,
  bookedHoursAgo,
  status = "booked",
) {
  const patient = await createPatient();
  const id = await createAppointment(doctor, patient, {
    from: minutes,
    status,
  });
  await db.query(
    `update public.appointments
     set created_at = now() - make_interval(hours => $2::int) where id = $1`,
    [id, bookedHoursAgo],
  );
  return { id, patient };
}

async function testReminders() {
  section("Appointment reminders (APT-05)");

  const doctor = await createDoctor();
  const server = { role: "service_role" };
  const claim = () => rpc(server, "claim_appointment_reminders");
  const visitFor = (...args) => reminderVisit(doctor, ...args);

  denied(
    "a guest can't run the job",
    await rpc(null, "claim_appointment_reminders"),
  );
  denied(
    "a user can't run it",
    await rpc(await createPatient(), "claim_appointment_reminders"),
  );
  denied(
    "the log is closed even to the secret key",
    await as(server, `select * from public.appointment_reminders`),
  );

  await claim();

  const tomorrow = await visitFor(23 * 60, 48);
  const soon = await visitFor(40 * 2, 48);
  const soonBookedLate = await visitFor(30, 0);
  const sameDay = await visitFor(5 * 60, 2);
  const farAway = await visitFor(3 * 24 * 60, 96);
  const cancelled = await visitFor(23 * 60 + 40, 48, "cancelled");

  const first = await claim();
  const of = ({ id }) =>
    first.data?.filter((row) => row.appointment_id === id).map((r) => r.kind);

  check(
    "a visit tomorrow gets the 24-hour one",
    of(tomorrow)?.join() === "24h",
  );
  check("someone who booked 5 hours ahead skips it", of(sameDay)?.length === 0);
  check("a visit 3 days off gets nothing", of(farAway)?.length === 0);
  check("a cancelled visit gets nothing", of(cancelled)?.length === 0);
  check(
    "a visit booked minutes ago gets nothing",
    of(soonBookedLate)?.length === 0,
  );
  check(
    "a visit further than an hour off isn't sent the 1-hour one",
    of(soon)?.join() === "24h",
  );
  check(
    "the row has what the email needs",
    first.data?.find((row) => row.appointment_id === tomorrow.id)
      ?.patient_email === tomorrow.patient.email,
  );

  const { rows: bell } = await db.query(
    `select kind from public.notifications
     where user_id = $1 and kind = 'appointment_reminder'`,
    [tomorrow.patient.id],
  );
  check("the bell gets it too", bell.length === 1);

  const second = await claim();
  check(
    "a second run sends nothing",
    second.data?.length === 0,
    `${second.data?.length} rows`,
  );

  await db.query(
    `update public.appointments
     set starts_at = now() + interval '5 minutes',
         ends_at = now() + interval '25 minutes'
     where id = $1`,
    [tomorrow.id],
  );
  const third = await claim();
  check(
    "the 1-hour one still goes out later",
    third.data?.length === 1 && third.data[0].kind === "1h",
  );

  await db.query(
    `update public.notifications set created_at = now() - interval '91 days'
     where user_id = $1`,
    [tomorrow.patient.id],
  );
  await claim();
  check(
    "notifications are purged after 90 days",
    (
      await db.query(`select 1 from public.notifications where user_id = $1`, [
        tomorrow.patient.id,
      ])
    ).rows.length === 0,
  );
}

async function testReminderRetries() {
  section("Failed reminder emails (REL-07)");

  const server = { role: "service_role" };
  const visit = async (minutes = 23 * 60) =>
    reminderVisit(await createDoctor(), minutes, 48);
  const claimFor = async ({ id }) =>
    (await rpc(server, "claim_appointment_reminders")).data?.filter(
      (row) => row.appointment_id === id,
    ) ?? [];
  const mark = (caller, { id }) =>
    rpc(caller, "mark_appointment_reminder_emailed", {
      p_appointment_id: id,
      p_kind: "24h",
    });
  const lastTriedLongAgo = ({ id }) =>
    db.query(
      `update public.appointment_reminders
       set last_attempt_at = now() - interval '11 minutes'
       where appointment_id = $1`,
      [id],
    );

  const failed = await visit();
  check("the first run claims it", (await claimFor(failed)).length === 1);

  denied("a guest can't mark it as sent", await mark(null, failed));
  denied(
    "a user can't mark it as sent",
    await mark(await createPatient(), failed),
  );

  check(
    "a run minutes later leaves it alone",
    (await claimFor(failed)).length === 0,
  );

  await lastTriedLongAgo(failed);
  const retry = await claimFor(failed);
  check(
    "a failed email is sent again",
    retry.length === 1 &&
      retry[0].kind === "24h" &&
      retry[0].patient_email === failed.patient.email,
  );
  check(
    "an overlapping run can't send it twice",
    (await claimFor(failed)).length === 0,
  );

  const { rows: bell } = await db.query(
    `select 1 from public.notifications
     where user_id = $1 and kind = 'appointment_reminder'`,
    [failed.patient.id],
  );
  check("a retry rings the bell only once", bell.length === 1);

  await lastTriedLongAgo(failed);
  check("the third try goes out", (await claimFor(failed)).length === 1);
  await lastTriedLongAgo(failed);
  check("retries stop after 3 attempts", (await claimFor(failed)).length === 0);

  const sent = await visit();
  await claimFor(sent);
  succeeded("the job marks it as sent", await mark(server, sent));
  await lastTriedLongAgo(sent);
  check("a sent email isn't retried", (await claimFor(sent)).length === 0);

  const cancelled = await visit();
  await claimFor(cancelled);
  await db.query(
    `update public.appointments set status = 'cancelled' where id = $1`,
    [cancelled.id],
  );
  await lastTriedLongAgo(cancelled);
  check(
    "a cancelled visit isn't retried",
    (await claimFor(cancelled)).length === 0,
  );

  const past = await visit();
  await claimFor(past);
  await db.query(
    `update public.appointments
     set starts_at = now() - interval '2 hours',
         ends_at = now() - interval '90 minutes'
     where id = $1`,
    [past.id],
  );
  await lastTriedLongAgo(past);
  check("a past visit isn't retried", (await claimFor(past)).length === 0);

  const close = await visit();
  await claimFor(close);
  await db.query(
    `update public.appointments
     set starts_at = now() + interval '30 minutes',
         ends_at = now() + interval '50 minutes'
     where id = $1`,
    [close.id],
  );
  await lastTriedLongAgo(close);
  check(
    "inside the last hour only the 1-hour one goes out",
    (await claimFor(close)).map((row) => row.kind).join() === "1h",
  );
}

async function testReminderSchedule() {
  section("Starting reminders from the database (REL-07)");

  const { rows: jobs } = await db.query(
    `select schedule, command from cron.job where jobname = 'appointment-reminders'`,
  );
  check(
    "the job runs every 15 minutes",
    jobs.length === 1 && jobs[0].schedule === "*/15 * * * *",
  );

  const runJob = () => db.query(jobs[0].command);
  const requests = async () =>
    (await db.query(`select * from net.requests`)).rows;
  const addSecret = (name, value) =>
    db.query(`insert into vault.decrypted_secrets values ($1, $2)`, [
      name,
      value,
    ]);

  denied(
    "a guest can't start it",
    await rpc(null, "request_appointment_reminders", {}, "private"),
  );
  denied(
    "a user can't start it",
    await rpc(
      await createPatient(),
      "request_appointment_reminders",
      {},
      "private",
    ),
  );

  await runJob();
  check("without secrets, no request is made", (await requests()).length === 0);

  await addSecret("reminders_site_url", "https://medease.example/");
  await runJob();
  check(
    "half the secrets still make no request",
    (await requests()).length === 0,
  );

  await addSecret("reminders_cron_secret", "test-cron-value");
  await runJob();
  const made = await requests();
  check("with secrets, one request is made", made.length === 1);
  check(
    "it calls the reminders route",
    made[0]?.url === "https://medease.example/api/cron/appointment-reminders",
    made[0]?.url,
  );
  check(
    "it sends the secret as a bearer token",
    made[0]?.headers.Authorization === "Bearer test-cron-value",
  );
  check(
    "it waits long enough for email",
    made[0]?.timeout_milliseconds === 120000,
  );
}

async function testReminderUpgrade() {
  section("Upgrading reminders that were already sent (REL-07)");

  const older = await createOlderDatabase(
    "20261101150000_notifications_time_off.sql",
  );
  const id = randomUUID();

  // The row is all this test needs, so skip the appointment behind it.
  await older.db.exec(`set session_replication_role = replica`);
  await older.db.query(
    `insert into public.appointment_reminders (appointment_id, kind, sent_at)
     values ($1, '24h', now() - interval '1 day')`,
    [id],
  );
  await older.db.exec(`set session_replication_role = origin`);

  await older.upgrade();

  const { rows } = await older.db.query(
    `select emailed_at = sent_at as sent, attempts
     from public.appointment_reminders where appointment_id = $1`,
    [id],
  );
  check(
    "old reminders count as sent, so nobody hears again",
    rows[0]?.sent === true && rows[0]?.attempts === 0,
  );
}

// A zone where it's about noon right now, so a reminder's hour can't cross midnight
// whenever these tests run. Etc/GMT names have the sign reversed.
function middayZone() {
  const hoursAhead = 12 - new Date().getUTCHours();
  return {
    zone: `Etc/GMT${hoursAhead >= 0 ? "-" : "+"}${Math.abs(hoursAhead)}`,
    // "HH:MM" on that zone's clock, some minutes from now.
    clock: (minutes) =>
      new Date(Date.now() + hoursAhead * 60 * MINUTE + minutes * MINUTE)
        .toISOString()
        .slice(11, 16),
  };
}

async function testMedicineReminderSettings() {
  section("Medicine reminder settings (MED-02)");

  const patient = await createPatient();
  const other = await createPatient();
  const doctor = await createDoctor();
  const server = { role: "service_role" };
  const settings = (fields = {}) => ({
    p_enabled: true,
    p_morning: "07:30",
    p_afternoon: "13:00",
    p_night: "22:00",
    p_timezone: "Asia/Dubai",
    ...fields,
  });
  const save = (caller, fields) =>
    rpc(caller, "save_medicine_reminders", settings(fields));
  const rowOf = async ({ id }) =>
    (
      await db.query(
        `select * from public.medicine_reminder_settings where patient_id = $1`,
        [id],
      )
    ).rows[0];

  denied("a guest can't save", await save(null));
  refused("a doctor can't save", await save(doctor), "not_patient");
  refused(
    "the morning has to come before the afternoon",
    await save(patient, { p_morning: "15:00" }),
    "invalid_reminder_times",
  );
  refused(
    "the afternoon has to come before the night",
    await save(patient, { p_night: "13:00" }),
    "invalid_reminder_times",
  );
  refused(
    "a missing time is refused",
    await save(patient, { p_night: null }),
    "invalid_reminder_times",
  );
  refused(
    "a zone that doesn't exist is refused",
    await save(patient, { p_timezone: "Mars/Olympus" }),
    "invalid_timezone",
  );
  check("nothing was saved by those", !(await rowOf(patient)));

  succeeded("a patient saves their settings", await save(patient));
  const saved = await rowOf(patient);
  check(
    "the settings are stored",
    saved?.enabled === true &&
      saved?.morning_time === "07:30:00" &&
      saved?.afternoon_time === "13:00:00" &&
      saved?.night_time === "22:00:00" &&
      saved?.timezone === "Asia/Dubai",
  );

  succeeded(
    "saving again changes the same row",
    await save(patient, { p_enabled: false, p_night: "23:15" }),
  );
  const changed = await rowOf(patient);
  check(
    "the change holds and the unsubscribe link keeps working",
    changed?.enabled === false &&
      changed?.night_time === "23:15:00" &&
      changed?.unsubscribe_token === saved?.unsubscribe_token,
  );

  await save(other);
  const rows = async (caller) =>
    (
      await as(
        caller,
        `select patient_id from public.medicine_reminder_settings`,
      )
    ).data ?? [];
  const seen = await rows(patient);
  check(
    "a patient reads only their own",
    seen.length === 1 && seen[0].patient_id === patient.id,
  );
  check("a doctor reads none", (await rows(doctor)).length === 0);
  denied(
    "a guest reads nothing",
    await as(null, `select 1 from public.medicine_reminder_settings`),
  );
  denied(
    "a patient can't write the table directly",
    await as(
      patient,
      `update public.medicine_reminder_settings set enabled = true`,
    ),
  );

  await db.query(
    `insert into auth.mfa_factors (user_id, status) values ($1, 'verified')`,
    [patient.id],
  );
  check(
    "with an app paired, a password alone reads nothing",
    (await rows(patient)).length === 0,
  );
  check(
    "with the second factor they read it",
    (await rows({ ...patient, aal: "aal2" })).length === 1,
  );
  refused(
    "and a password alone can't save",
    {
      ...(await save(patient)),
      fn: "require_second_factor",
    },
    "second_factor_required",
  );
  succeeded(
    "with the second factor they can",
    await save({ ...patient, aal: "aal2" }),
  );

  const token = saved?.unsubscribe_token;
  const unsubscribe = (caller, value) =>
    rpc(caller, "unsubscribe_medicine_reminders", { p_token: value });

  denied("a guest can't call it directly", await unsubscribe(null, token));
  denied("nor can a patient", await unsubscribe(other, token));

  const unknown = await unsubscribe(server, randomUUID());
  check(
    "an unknown token changes nothing",
    unknown.data?.[0]?.unsubscribe_medicine_reminders === false &&
      (await rowOf(patient))?.enabled === true,
  );
  const done = await unsubscribe(server, token);
  check(
    "the emailed link turns reminders off without signing in",
    done.data?.[0]?.unsubscribe_medicine_reminders === true &&
      (await rowOf(patient))?.enabled === false,
  );
  check("and nobody else's", (await rowOf(other))?.enabled === true);
}

async function testNotificationPreferences() {
  section("Email settings (PRO-05, NTF-07)");

  const patient = await createPatient();
  const other = await createPatient();
  const doctor = await createDoctor();
  const lab = await createUser("lab");
  const server = { role: "service_role" };
  const save = (caller, enabled, channel = "email") =>
    rpc(caller, "save_notification_preferences", {
      p_channel: channel,
      p_enabled: enabled,
    });
  const settingsOf = async ({ id }) =>
    Object.fromEntries(
      (
        await db.query(
          `select category, enabled from public.notification_preferences
           where user_id = $1 and channel = 'email'`,
          [id],
        )
      ).rows.map((row) => [row.category, row.enabled]),
    );
  const wanted = async (caller, { id }, category) =>
    rpc(caller, "email_wanted", { p_user_id: id, p_category: category });
  const isWanted = async (user, category) =>
    (await wanted(server, user, category)).data?.[0]?.email_wanted;

  denied("a guest can't save", await save(null, []));
  refused(
    "a lab has nothing to choose yet",
    await save(lab, []),
    "no_notification_settings",
  );
  refused(
    "only email can be set",
    await save(patient, [], "sms"),
    "invalid_channel",
  );
  refused(
    "a patient can't set a doctor's category",
    await save(patient, ["doctor_bookings"]),
    "invalid_category",
  );
  refused(
    "a missing list is refused",
    await save(patient, null),
    "invalid_category",
  );
  check(
    "nothing was saved by those",
    Object.keys(await settingsOf(patient)).length === 0,
  );
  check(
    "with nothing saved, every email is on",
    (await isWanted(patient, "appointment_reminders")) === true &&
      (await isWanted(patient, "prescriptions")) === true,
  );

  succeeded(
    "a patient turns reminder emails off",
    await save(patient, ["prescriptions"]),
  );
  const saved = await settingsOf(patient);
  check(
    "each of their categories is stored",
    saved.appointment_reminders === false &&
      saved.prescriptions === true &&
      !("doctor_bookings" in saved),
  );
  check(
    "the secret key sees which emails they want",
    (await isWanted(patient, "appointment_reminders")) === false &&
      (await isWanted(patient, "prescriptions")) === true,
  );

  succeeded(
    "saving again changes the same rows",
    await save(patient, ["appointment_reminders"]),
  );
  const changed = await settingsOf(patient);
  check(
    "the change holds",
    changed.appointment_reminders === true && changed.prescriptions === false,
  );

  succeeded("a doctor turns booking emails off", await save(doctor, []));
  check(
    "and only their own",
    (await isWanted(doctor, "doctor_bookings")) === false &&
      (await isWanted(other, "prescriptions")) === true,
  );

  denied(
    "a guest can't ask who wants email",
    await wanted(null, patient, "prescriptions"),
  );
  denied("nor can a patient", await wanted(other, patient, "prescriptions"));

  await save(other, []);
  const rows = async (caller) =>
    (
      await as(
        caller,
        `select distinct user_id from public.notification_preferences`,
      )
    ).data ?? [];
  const seen = await rows(patient);
  check(
    "a user reads only their own",
    seen.length === 1 && seen[0].user_id === patient.id,
  );
  const doctorSees = await rows(doctor);
  check(
    "a doctor reads no patient's",
    doctorSees.length === 1 && doctorSees[0].user_id === doctor.id,
  );
  denied(
    "a guest reads nothing",
    await as(null, `select 1 from public.notification_preferences`),
  );
  denied(
    "a user can't write the table directly",
    await as(
      patient,
      `update public.notification_preferences set enabled = true`,
    ),
  );
  denied(
    "nor can the secret key",
    await as(server, `select 1 from public.notification_preferences`),
  );
  refused(
    "a doctor with only a password can't change them",
    {
      ...(await save({ ...doctor, aal: "aal1" }, ["doctor_bookings"])),
      fn: "require_second_factor",
    },
    "second_factor_required",
  );
  check(
    "and nothing changed",
    (await isWanted(doctor, "doctor_bookings")) === false,
  );

  section("Reminder emails that were turned off (PRO-05)");

  const claimFor = async ({ id }) =>
    (await rpc(server, "claim_appointment_reminders")).data?.filter(
      (row) => row.appointment_id === id,
    ) ?? [];
  const retryLater = ({ id }) =>
    db.query(
      `update public.appointment_reminders
       set last_attempt_at = now() - interval '11 minutes'
       where appointment_id = $1 and last_attempt_at is not null`,
      [id],
    );

  const quiet = await reminderVisit(await createDoctor(), 23 * 60, 48);
  await save(quiet.patient, ["prescriptions"]);
  check("no email is claimed", (await claimFor(quiet)).length === 0);
  const { rows: bell } = await db.query(
    `select 1 from public.notifications
     where user_id = $1 and kind = 'appointment_reminder'`,
    [quiet.patient.id],
  );
  check("the bell still gets it", bell.length === 1);

  // What 20261102090000_reminder_schedule.sql does when it's run again.
  await db.query(
    `update public.appointment_reminders set emailed_at = sent_at
     where emailed_at is null and attempts = 0`,
  );
  const { rows: skipped } = await db.query(
    `select emailed_at, email_skipped from public.appointment_reminders
     where appointment_id = $1`,
    [quiet.id],
  );
  check(
    "it's marked skipped, and re-running the older migration doesn't mark it sent",
    skipped.length === 1 &&
      skipped[0].email_skipped === true &&
      skipped[0].emailed_at === null,
  );

  await save(quiet.patient, ["appointment_reminders", "prescriptions"]);
  await retryLater(quiet);
  check(
    "turning emails back on doesn't send a reminder that was skipped",
    (await claimFor(quiet)).length === 0,
  );

  const failed = await reminderVisit(await createDoctor(), 23 * 60, 48);
  check(
    "a reminder is claimed while on",
    (await claimFor(failed)).length === 1,
  );
  await save(failed.patient, []);
  await retryLater(failed);
  check(
    "a failed one isn't retried once turned off",
    (await claimFor(failed)).length === 0,
  );
  await save(failed.patient, ["appointment_reminders"]);
  await retryLater(failed);
  check(
    "and is retried if turned on again",
    (await claimFor(failed)).length === 1,
  );
}

async function testMessaging() {
  section("Starting a conversation (MSG-01)");

  const DAY_MINUTES = 24 * 60;
  const doctor = await createDoctor();
  const otherDoctor = await createDoctor();
  const patient = await createPatient();
  const lapsed = await createPatient();
  const stranger = await createPatient();
  const lab = await createUser("lab");

  // A visit 3 days ago, one 8 days ago, and a booking that was cancelled.
  await createAppointment(doctor, patient, {
    from: -3 * DAY_MINUTES,
    status: "completed",
  });
  await createAppointment(doctor, lapsed, {
    from: -8 * DAY_MINUTES,
    status: "completed",
  });
  await createAppointment(otherDoctor, patient, {
    from: 2 * DAY_MINUTES,
    status: "cancelled",
  });

  const open = (caller, otherId) =>
    rpc(caller, "open_conversation", { p_other_id: otherId });
  const opened = (result) => result.data?.[0]?.open_conversation;
  const send = (caller, conversationId, body) =>
    rpc(caller, "send_message", {
      p_conversation_id: conversationId,
      p_body: body,
    });
  const conversations = async (caller, id = null) =>
    (await rpc(caller, "get_conversations", { p_conversation_id: id })).data ??
    [];
  const window = (caller, conversationId, action) =>
    rpc(caller, "set_message_window", {
      p_conversation_id: conversationId,
      p_action: action,
    });

  denied("a guest can't start one", await open(null, doctor.id));
  refused("a lab can't message", await open(lab, doctor.id), "not_allowed");
  refused(
    "a patient who never booked the doctor can't",
    await open(stranger, doctor.id),
    "no_appointment",
  );
  refused(
    "nor can one whose only booking was cancelled",
    await open(patient, otherDoctor.id),
    "no_appointment",
  );

  const first = await open(patient, doctor.id);
  succeeded("a patient with a visit starts one", first);
  const conversationId = opened(first);
  check(
    "opening again finds the same conversation",
    opened(await open(patient, doctor.id)) === conversationId,
  );
  check(
    "and the doctor opening it from their side does too",
    opened(await open(doctor, patient.id)) === conversationId,
  );

  section("Sending messages (MSG-01)");

  denied("a guest can't send", await send(null, conversationId, "Hi"));
  refused(
    "someone outside the conversation can't send into it",
    await send(stranger, conversationId, "Hi"),
    "not_participant",
  );
  refused(
    "nor can another doctor",
    await send(otherDoctor, conversationId, "Hi"),
    "not_participant",
  );
  refused(
    "an empty message is refused",
    await send(patient, conversationId, "  \n "),
    "invalid_message",
  );
  refused(
    "so is one over 2000 characters",
    await send(patient, conversationId, "a".repeat(2001)),
    "invalid_message",
  );
  succeeded(
    "the patient sends one",
    await send(patient, conversationId, "  Is the dose with food?\n"),
  );
  const { rows: sent } = await db.query(
    `select m.*, c.last_message_at from public.messages m
     join public.conversations c on c.id = m.conversation_id
     where m.conversation_id = $1`,
    [conversationId],
  );
  check(
    "it's stored trimmed, from the patient to the doctor",
    sent.length === 1 &&
      sent[0].body === "Is the dose with food?" &&
      sent[0].sender_id === patient.id &&
      sent[0].recipient_id === doctor.id &&
      sent[0].read_at === null,
  );
  check(
    "and the conversation moves to the top",
    sent[0]?.last_message_at?.getTime() === sent[0]?.created_at?.getTime(),
  );
  succeeded(
    "the doctor replies",
    await send(doctor, conversationId, "Yes, after breakfast."),
  );
  succeeded(
    "2000 characters is fine",
    await send(patient, conversationId, "b".repeat(2000)),
  );

  section("Who can read them (MSG-01, MSG-02)");

  const messagesSeenBy = async (caller) =>
    (
      await as(
        caller,
        `select body from public.messages where conversation_id = $1`,
        [conversationId],
      )
    ).data ?? [];
  check(
    "the patient reads all 3",
    (await messagesSeenBy(patient)).length === 3,
  );
  check("the doctor reads all 3", (await messagesSeenBy(doctor)).length === 3);
  check(
    "another patient reads none",
    (await messagesSeenBy(stranger)).length === 0,
  );
  check(
    "another doctor reads none",
    (await messagesSeenBy(otherDoctor)).length === 0,
  );
  denied(
    "a guest reads nothing",
    await as(null, `select 1 from public.messages`),
  );
  check(
    "a doctor with only a password reads nothing",
    (await messagesSeenBy({ ...doctor, aal: "aal1" })).length === 0,
  );
  refused(
    "nor lists conversations",
    await rpc({ ...doctor, aal: "aal1" }, "get_conversations"),
    "second_factor_required",
  );
  refused(
    "nor sends",
    {
      ...(await send({ ...doctor, aal: "aal1" }, conversationId, "Hi")),
      fn: "require_second_factor",
    },
    "second_factor_required",
  );
  denied(
    "nobody writes messages directly",
    await as(
      patient,
      `insert into public.messages (conversation_id, sender_id, recipient_id, body)
       values ($1, $2, $3, 'x')`,
      [conversationId, patient.id, doctor.id],
    ),
  );
  denied(
    "or marks them read directly",
    await as(doctor, `update public.messages set read_at = now()`),
  );
  denied(
    "or edits a conversation directly",
    await as(
      patient,
      `update public.conversations set patient_window_ends_at = null`,
    ),
  );

  const [doctorView] = await conversations(doctor);
  check(
    "the doctor's list names the patient and shows the last message",
    doctorView?.id === conversationId &&
      doctorView.other_name === "Sql Patient" &&
      doctorView.last_body === "b".repeat(2000) &&
      doctorView.last_sender_id === patient.id &&
      doctorView.unread === 2 &&
      doctorView.can_write === true,
  );
  const [patientView] = await conversations(patient, conversationId);
  check(
    "the patient's names the doctor, with 1 unread",
    patientView?.other_name === "Sql Doctor" && patientView.unread === 1,
  );
  check(
    "someone else lists nothing",
    (await conversations(stranger)).length === 0 &&
      (await conversations(stranger, conversationId)).length === 0,
  );
  check("a guest lists nothing", (await conversations(null)).length === 0);

  const read = async (caller, id = conversationId) =>
    (await rpc(caller, "mark_conversation_read", { p_conversation_id: id }))
      .data?.[0]?.mark_conversation_read;
  check("someone else can't mark them read", (await read(stranger)) === 0);
  check("the doctor reads the patient's 2", (await read(doctor)) === 2);
  check("reading again marks nothing", (await read(doctor)) === 0);
  const { rows: receipts } = await db.query(
    `select sender_id, read_at from public.messages where conversation_id = $1`,
    [conversationId],
  );
  check(
    "only the messages to the doctor are read",
    receipts.every((row) =>
      row.sender_id === patient.id
        ? row.read_at !== null
        : row.read_at === null,
    ),
  );
  check(
    "and the doctor's unread count is 0",
    (await conversations(doctor))[0]?.unread === 0,
  );

  section("Messaging window (MSG-04)");

  const lapsedId = opened(await open(lapsed, doctor.id));
  check("a patient whose visit was 8 days ago can still open it", !!lapsedId);
  refused(
    "but can't write",
    await send(lapsed, lapsedId, "Hello?"),
    "window_closed",
  );
  check(
    "and the list says so",
    (await conversations(lapsed))[0]?.can_write === false,
  );
  succeeded(
    "the doctor can still write to them",
    await send(doctor, lapsedId, "How are you feeling?"),
  );

  refused(
    "a patient can't change the window",
    await window(patient, conversationId, "close"),
    "not_doctor",
  );
  refused(
    "nor can another doctor",
    await window(otherDoctor, conversationId, "close"),
    "not_doctor",
  );
  refused(
    "only extend or close",
    await window(doctor, conversationId, "forever"),
    "invalid_action",
  );
  refused(
    "a missing action is refused",
    await window(doctor, conversationId, null),
    "invalid_action",
  );

  succeeded(
    "the doctor closes it",
    await window(doctor, conversationId, "close"),
  );
  refused(
    "and the patient can't write",
    await send(patient, conversationId, "One more thing"),
    "window_closed",
  );

  const extended = await window(doctor, lapsedId, "extend");
  const endsAt = extended.data?.[0]?.set_message_window;
  const days = (endsAt - Date.now()) / DAY;
  check(
    "extending a lapsed window gives 7 days from now",
    days > 6.99 && days <= 7,
    `${days.toFixed(3)} days`,
  );
  succeeded(
    "and the patient can write again",
    await send(lapsed, lapsedId, "Thank you"),
  );
  const again = (await window(doctor, lapsedId, "extend")).data?.[0]
    ?.set_message_window;
  check(
    "extending again adds 7 more days",
    Math.abs((again - endsAt) / DAY - 7) < 0.001,
  );

  await createAppointment(doctor, patient, { from: 5 * DAY_MINUTES });
  check(
    "a new booking reopens a window the doctor closed",
    (
      await db.query(
        `select patient_window_ends_at from public.conversations where id = $1`,
        [conversationId],
      )
    ).rows[0]?.patient_window_ends_at === null,
  );
  succeeded(
    "so the patient can write before the visit",
    await send(patient, conversationId, "See you then"),
  );
  check(
    "but a booking doesn't shorten a longer extension",
    await (async () => {
      await createAppointment(doctor, lapsed, { from: 6 * DAY_MINUTES });
      const { rows } = await db.query(
        `select patient_window_ends_at from public.conversations where id = $1`,
        [lapsedId],
      );
      return rows[0]?.patient_window_ends_at?.getTime() === again?.getTime();
    })(),
  );

  // Closed two hours ago, with a visit already booked: once the visit happens,
  // the patient gets their usual 7 days, though no new booking was made.
  const booked = await createPatient();
  const bookedDoctor = await createDoctor();
  await createAppointment(bookedDoctor, booked, {
    from: -3 * DAY_MINUTES,
    status: "completed",
  });
  const upcoming = await createAppointment(bookedDoctor, booked, {
    from: 2 * DAY_MINUTES,
  });
  const bookedId = opened(await open(booked, bookedDoctor.id));
  await window(bookedDoctor, bookedId, "close");
  await db.query(
    `update public.conversations
     set patient_window_ends_at = now() - interval '2 hours',
         patient_window_set_at = now() - interval '2 hours'
     where id = $1`,
    [bookedId],
  );
  refused(
    "closing holds while a visit booked earlier is still ahead",
    await send(booked, bookedId, "Hello"),
    "window_closed",
  );
  await db.query(
    `update public.appointments
     set starts_at = now() - interval '1 hour',
         ends_at = now() - interval '30 minutes',
         status = 'completed'
     where id = $1`,
    [upcoming],
  );
  succeeded(
    "once that visit has happened, the patient can write again",
    await send(booked, bookedId, "Thanks for today"),
  );
  const reopenedEnd = (await conversations(booked, bookedId))[0]
    ?.patient_window_ends_at;
  check(
    "for 7 days after it",
    Math.abs((new Date(reopenedEnd) - Date.now()) / DAY - 7) < 0.05,
  );

  check(
    "the list returns only the newest conversations asked for",
    (await rpc(doctor, "get_conversations", { p_limit: 1 })).data?.length === 1,
  );

  const formerDoctor = await createDoctor();
  const former = await createPatient();
  const formerVisit = await createAppointment(formerDoctor, former, {
    from: 3 * DAY_MINUTES,
  });
  const formerId = opened(await open(former, formerDoctor.id));
  await db.query(
    `update public.appointments set status = 'cancelled' where id = $1`,
    [formerVisit],
  );
  refused(
    "once every booking is cancelled, nobody can write",
    await send(formerDoctor, formerId, "Hello"),
    "no_appointment",
  );

  section("Live delivery (MSG-02)");

  const { rows: published } = await db.query(
    `select tablename from pg_publication_tables
     where pubname = 'supabase_realtime' and tablename = 'messages'`,
  );
  check(
    "messages go out by Broadcast, not Postgres Changes",
    published.length === 0,
  );

  const events = async (userId) =>
    (
      await db.query(
        `select event, payload, private from realtime.messages
         where topic = $1 order by id`,
        [`user:${userId}`],
      )
    ).rows;
  const liveDoctor = await createDoctor();
  const livePatient = await createPatient();
  await createAppointment(liveDoctor, livePatient, { from: DAY_MINUTES });
  const liveId = opened(await open(livePatient, liveDoctor.id));
  await db.query(`delete from realtime.messages`);
  const liveSent = await send(livePatient, liveId, "Live hello");
  const liveMessageId = liveSent.data?.[0]?.id;
  const [toDoctor] = await events(liveDoctor.id);
  const [toPatient] = await events(livePatient.id);
  check(
    "a sent message goes to both people's private channels",
    toDoctor?.event === "message" &&
      toDoctor.private === true &&
      toDoctor.payload.id === liveMessageId &&
      toDoctor.payload.body === "Live hello" &&
      toDoctor.payload.recipient_id === liveDoctor.id &&
      toPatient?.payload.id === liveMessageId,
  );
  check(
    "and to nobody else",
    (await db.query(`select count(*)::int as n from realtime.messages`)).rows[0]
      .n === 2,
  );

  await db.query(`delete from realtime.messages`);
  await read(liveDoctor, liveId);
  const [receiptToPatient] = await events(livePatient.id);
  const [receiptToDoctor] = await events(liveDoctor.id);
  check(
    "reading sends one receipt to both, with how many were read",
    receiptToPatient?.event === "read" &&
      receiptToPatient.payload.conversation_id === liveId &&
      receiptToPatient.payload.reader_id === liveDoctor.id &&
      receiptToPatient.payload.count === 1 &&
      receiptToDoctor?.event === "read",
  );
  await db.query(`delete from realtime.messages`);
  await read(liveDoctor, liveId);
  check(
    "reading with nothing new sends nothing",
    (await db.query(`select count(*)::int as n from realtime.messages`)).rows[0]
      .n === 0,
  );

  await send(liveDoctor, liveId, "Live reply");
  const listen = async (caller, topic) => {
    await db.query(`select set_config('realtime.topic', $1, false)`, [topic]);
    const result = await as(
      caller,
      `select count(*)::int as n from realtime.messages`,
    );
    await db.query(`select set_config('realtime.topic', '', false)`);
    return result.data?.[0]?.n ?? 0;
  };
  check(
    "a person can join their own channel",
    (await listen(livePatient, `user:${livePatient.id}`)) > 0,
  );
  check(
    "but not someone else's",
    (await listen(stranger, `user:${livePatient.id}`)) === 0 &&
      (await listen(liveDoctor, `user:${livePatient.id}`)) === 0,
  );
  check(
    "a doctor with only a password can't join their own",
    (await listen({ ...liveDoctor, aal: "aal1" }, `user:${liveDoctor.id}`)) ===
      0,
  );
  await db.query(`select set_config('realtime.topic', $1, false)`, [
    `user:${livePatient.id}`,
  ]);
  const spoof = await as(
    livePatient,
    `insert into realtime.messages (topic, extension) values ($1, 'broadcast')`,
    [`user:${livePatient.id}`],
  );
  await db.query(`select set_config('realtime.topic', '', false)`);
  denied("nobody can send on these channels from the browser", spoof);
}

async function testMedicineReminders() {
  section("Medicine reminders (MED-01)");

  const server = { role: "service_role" };
  const { zone, clock } = middayZone();
  const claim = () => rpc(server, "claim_medicine_reminders");
  const claimedFor = async ({ id }) =>
    (await claim()).data?.filter((row) => row.patient_id === id) ?? [];

  // A patient with reminders on whose morning dose was due `minutesAgo`. The other
  // two dose times are far off, so only that one can match.
  const remindedPatient = async (minutesAgo = 5, fields = {}) => {
    const patient = await createPatient();
    await db.query(
      `insert into public.medicine_reminder_settings (
         patient_id, enabled, timezone, morning_time, afternoon_time, night_time
       ) values ($1, $2, $3, $4, $5, '23:30')`,
      [patient.id, fields.enabled ?? true, zone, clock(-minutesAgo), "23:00"],
    );
    return patient;
  };

  // A prescription issued `daysAgo`. A new doctor each time, so visits can't overlap.
  const prescribe = async (patient, items = [medicine()], daysAgo = 0) => {
    const doctor = await createDoctor();
    const visit = await startedVisit(doctor, patient);
    const result = await issue(doctor, visit, { p_items: items });
    const id = issued(result)?.id;
    await db.query(
      `update public.prescriptions
       set issued_at = issued_at - make_interval(days => $2::int) where id = $1`,
      [id, daysAgo],
    );
    return { doctor, visit, id };
  };

  const remindedFor = async (items, daysAgo) => {
    const patient = await remindedPatient();
    await prescribe(patient, items, daysAgo);
    return (await claimedFor(patient)).length;
  };

  denied(
    "a guest can't run the job",
    await rpc(null, "claim_medicine_reminders"),
  );
  denied(
    "a user can't run it",
    await rpc(await createPatient(), "claim_medicine_reminders"),
  );
  const mark = (caller, row) =>
    rpc(caller, "mark_medicine_reminder_emailed", {
      p_patient_id: row.patient_id,
      p_local_date: row.local_date,
      p_dose_time: row.dose_time,
    });
  denied(
    "a user can't mark one as sent",
    await mark(await createPatient(), {
      patient_id: randomUUID(),
      local_date: "2026-01-01",
      dose_time: "morning",
    }),
  );
  denied(
    "the log is closed even to the secret key",
    await as(server, `select * from public.medicine_reminders`),
  );

  await claim();

  const patient = await remindedPatient();
  await prescribe(patient, [medicine(), medicine({ medicine: "Paracetamol" })]);
  const first = await claimedFor(patient);
  check("two medicines at one time make one reminder", first.length === 1);
  check(
    "it's for the dose time that's due",
    first[0]?.dose_time === "morning",
    first[0]?.dose_time,
  );
  check(
    "it carries what the email needs and no medicines",
    first[0]?.patient_name === "Sql" &&
      first[0]?.patient_email === patient.email &&
      Boolean(first[0]?.unsubscribe_token) &&
      Object.keys(first[0] ?? {})
        .sort()
        .join() ===
        "dose_time,local_date,patient_email,patient_id,patient_name,unsubscribe_token",
  );
  check("the next run sends nothing", (await claimedFor(patient)).length === 0);

  check(
    "a medicine for another time of day doesn't count",
    (await remindedFor([medicine({ dose_times: ["night"] })])) === 0,
  );
  check(
    "a medicine taken only when needed never reminds",
    (await remindedFor([
      medicine({ frequency: "as_needed", dose_times: [] }),
    ])) === 0,
  );
  check("the first day of a course reminds", (await remindedFor()) === 1);
  check(
    "the last day of a course reminds",
    (await remindedFor([medicine({ duration_days: 5 })], 4)) === 1,
  );
  check(
    "the day after a course ends doesn't",
    (await remindedFor([medicine({ duration_days: 5 })], 5)) === 0,
  );
  check(
    "an ongoing medicine keeps reminding",
    (await remindedFor([medicine({ duration_days: null })], 200)) === 1,
  );
  const weekly = [medicine({ frequency: "weekly", duration_days: 60 })];
  check(
    "a weekly medicine reminds on its day",
    (await remindedFor(weekly, 14)) === 1,
  );
  check("and not on the others", (await remindedFor(weekly, 3)) === 0);

  const cancelled = await remindedPatient();
  const toCancel = await prescribe(cancelled);
  await rpc(toCancel.doctor, "cancel_prescription", {
    p_prescription_id: toCancel.id,
    p_reason: TAG,
  });
  check(
    "a cancelled prescription doesn't remind",
    (await claimedFor(cancelled)).length === 0,
  );

  const replaced = await remindedPatient();
  const toReplace = await prescribe(replaced);
  await issue(toReplace.doctor, toReplace.visit, {
    p_items: [medicine({ dose_times: ["night"] })],
    p_replaces_id: toReplace.id,
  });
  check(
    "only the newest version of a prescription counts",
    (await claimedFor(replaced)).length === 0,
  );

  const off = await remindedPatient(5, { enabled: false });
  await prescribe(off);
  check(
    "reminders stay off until turned on",
    (await claimedFor(off)).length === 0,
  );

  const early = await remindedPatient(-10);
  await prescribe(early);
  check(
    "nothing goes out before the time",
    (await claimedFor(early)).length === 0,
  );

  const late = await remindedPatient(61);
  await prescribe(late);
  check(
    "a reminder over an hour late is dropped",
    (await claimedFor(late)).length === 0,
  );

  const unconfirmed = await remindedPatient();
  await prescribe(unconfirmed);
  await db.query(
    `update auth.users set email_confirmed_at = null where id = $1`,
    [unconfirmed.id],
  );
  check(
    "an unconfirmed email address gets nothing",
    (await claimedFor(unconfirmed)).length === 0,
  );

  const noRow = await createPatient();
  await prescribe(noRow);
  check(
    "a patient who never opened settings gets nothing",
    (await claimedFor(noRow)).length === 0,
  );

  // Retries --------------------------------------------------------------------

  const rewind = (who, fields) =>
    db.query(
      `update public.medicine_reminders
       set last_attempt_at = last_attempt_at - interval '11 minutes' ${fields ?? ""}
       where patient_id = $1`,
      [who.id],
    );
  const logOf = async (who) =>
    (
      await db.query(
        `select * from public.medicine_reminders where patient_id = $1`,
        [who.id],
      )
    ).rows;

  const failing = await remindedPatient();
  await prescribe(failing);
  const [failed] = await claimedFor(failing);
  check(
    "a failed email isn't retried straight away",
    (await claimedFor(failing)).length === 0,
  );
  await rewind(failing);
  check(
    "it's sent again 10 minutes later",
    (await claimedFor(failing)).length === 1,
  );
  await rewind(failing);
  check("and a third time", (await claimedFor(failing)).length === 1);
  await rewind(failing);
  check("then it stops", (await claimedFor(failing)).length === 0);
  check(
    "and it's still one reminder",
    (await logOf(failing)).length === 1 &&
      (await logOf(failing))[0].attempts === 3 &&
      failed?.dose_time === "morning",
  );

  const delivered = await remindedPatient();
  await prescribe(delivered);
  const [sent] = await claimedFor(delivered);
  succeeded("the route marks a sent email", await mark(server, sent));
  await rewind(delivered);
  check(
    "a sent email isn't sent again",
    (await claimedFor(delivered)).length === 0,
  );

  const stopped = await remindedPatient();
  const stoppedRx = await prescribe(stopped);
  await claimedFor(stopped);
  await rpc(stoppedRx.doctor, "cancel_prescription", {
    p_prescription_id: stoppedRx.id,
    p_reason: TAG,
  });
  await rewind(stopped);
  check(
    "a retry stops if the prescription is cancelled meanwhile",
    (await claimedFor(stopped)).length === 0,
  );

  const unsubscribed = await remindedPatient();
  await prescribe(unsubscribed);
  await claimedFor(unsubscribed);
  await db.query(
    `update public.medicine_reminder_settings set enabled = false where patient_id = $1`,
    [unsubscribed.id],
  );
  await rewind(unsubscribed);
  check(
    "a retry stops if the patient turns reminders off",
    (await claimedFor(unsubscribed)).length === 0,
  );

  const stale = await remindedPatient();
  await prescribe(stale);
  await claimedFor(stale);
  await rewind(stale, ", scheduled_for = scheduled_for - interval '1 hour'");
  check(
    "a retry stops once the hour has passed",
    (await claimedFor(stale)).length === 0,
  );

  // Housekeeping ---------------------------------------------------------------

  const old = await remindedPatient(5, { enabled: false });
  await db.query(
    `insert into public.medicine_reminders (patient_id, local_date, dose_time, scheduled_for, sent_at)
     values ($1, '2020-01-01', 'night', now() - interval '91 days', now() - interval '91 days'),
            ($1, '2020-01-02', 'night', now() - interval '89 days', now() - interval '89 days')`,
    [old.id],
  );
  await claim();
  check(
    "the send log is kept for 90 days",
    (await logOf(old)).map((row) => row.dose_time).length === 1,
  );

  await db.query(`delete from auth.users where id = $1`, [delivered.id]);
  check(
    "deleting an account removes its reminders",
    (await logOf(delivered)).length === 0,
  );

  // The job --------------------------------------------------------------------

  const { rows: jobs } = await db.query(
    `select schedule, command from cron.job where jobname = 'medicine-reminders'`,
  );
  check(
    "the job runs every 15 minutes",
    jobs.length === 1 && jobs[0].schedule === "*/15 * * * *",
  );
  denied(
    "a user can't start it",
    await rpc(
      await createPatient(),
      "request_medicine_reminders",
      {},
      "private",
    ),
  );
  denied(
    "nor can they ask what's due",
    await rpc(
      await createPatient(),
      "has_dose_due",
      { p_patient_id: randomUUID(), p_dose_time: "morning" },
      "private",
    ),
  );

  await db.query(`delete from net.requests`);
  await db.query(jobs[0].command);
  const { rows: made } = await db.query(`select * from net.requests`);
  check(
    "it calls the medicine reminders route with the shared secrets",
    made.length === 1 &&
      made[0].url === "https://medease.example/api/cron/medicine-reminders" &&
      made[0].headers.Authorization === "Bearer test-cron-value" &&
      made[0].timeout_milliseconds === 120000,
    made[0]?.url,
  );

  await db.query(`delete from net.requests`);
  await db.query(`delete from vault.decrypted_secrets`);
  await db.query(jobs[0].command);
  check(
    "without secrets, no request is made",
    (await db.query(`select 1 from net.requests`)).rows.length === 0,
  );
}

// The rules that must hold for everything in the schema, including tables and
// functions that don't exist yet.
async function testSchemaRules() {
  section("Rules for the whole schema (SEC-01)");

  const { rows: tables } = await db.query(`
    select c.relname as name, c.relrowsecurity as rls
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  `);
  const unprotected = tables.filter((table) => !table.rls).map((t) => t.name);
  check(
    "every table has row level security on",
    unprotected.length === 0,
    unprotected.join(", "),
  );

  const { rows: functions } = await db.query(`
    select
      p.proname as name,
      p.prosecdef as definer,
      p.proconfig as config,
      has_function_privilege('anon', p.oid, 'execute') as guest,
      pg_get_function_result(p.oid) = 'trigger' as is_trigger
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.prokind = 'f'
  `);

  const loose = functions
    .filter(
      (fn) =>
        fn.definer &&
        !fn.config?.some((setting) => setting.startsWith("search_path=")),
    )
    .map((fn) => fn.name);
  check(
    "every SECURITY DEFINER function pins its search_path",
    loose.length === 0,
    loose.join(", "),
  );

  // Guests browse doctors and see consent versions; everything else needs an
  // account. has_confirmed_email is read by the public directory view.
  const guestAllowed = new Set([
    "get_doctor_slots",
    "has_confirmed_email",
    ...globalGuestFunctions,
  ]);
  const exposed = functions
    .filter((fn) => fn.guest && !fn.is_trigger && !guestAllowed.has(fn.name))
    .map((fn) => fn.name);
  check(
    "guests can call only the public functions",
    exposed.length === 0,
    exposed.join(", "),
  );

  const guestTables = new Set([
    "doctor_availability",
    "doctor_directory",
    "lab_directory",
    "lab_test_types",
    "lab_test_offers",
    "lab_test_catalog",
    "lab_package_offers",
    "lab_collection_areas",
    ...globalGuestTables,
  ]);
  const { rows: readable } = await db.query(`
    select c.relname as name
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'v')
      and has_table_privilege('anon', c.oid, 'select')
  `);
  const leaked = readable
    .map((table) => table.name)
    .filter((name) => !guestTables.has(name));
  check(
    "guests can read only public tables",
    leaked.length === 0,
    leaked.join(", "),
  );

  const { rows: writable } = await db.query(`
    select c.relname as name
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and (has_table_privilege('anon', c.oid, 'insert')
        or has_table_privilege('anon', c.oid, 'update')
        or has_table_privilege('anon', c.oid, 'delete'))
  `);
  check(
    "guests can write to nothing",
    writable.length === 0,
    writable.map((table) => table.name).join(", "),
  );
}

// QA-02 asks for every `raise exception` path. Read the functions as they stand
// after all migrations, and fail on any refusal no test above produced.
async function testConsents() {
  section("Consent records (AUTH-03, CMPL-02, PRV-02)");

  const server = { role: "service_role" };
  const patient = await createUser("patient", { consented: false });
  const other = await createUser("patient", { consented: false });
  const doctor = await createDoctor();
  const terms = { document: "terms", version: "1.0" };
  const telemedicine = { document: "telemedicine-consent", version: "1.0" };
  let bookings = 0;

  const accept = (caller, list) =>
    rpc(caller, "accept_consents", { p_consents: JSON.stringify(list) });
  const record = (caller, userId, list) =>
    rpc(caller, "record_consents", {
      p_user_id: userId,
      p_consents: JSON.stringify(list),
    });
  const withdraw = (caller, document) =>
    rpc(caller, "withdraw_consent", { p_document: document });
  const inSaveConsents = (result) => ({ ...result, fn: "save_consents" });
  const rowsFor = async (userId) =>
    (
      await db.query(
        `select document, version, withdrawn_at from public.user_consents
         where user_id = $1 order by id`,
        [userId],
      )
    ).rows;
  const auditFor = async (userId, action) =>
    (
      await db.query(
        `select actor_id, actor_role, details from public.audit_log
         where target_id = $1 and action = $2`,
        [userId, action],
      )
    ).rows;
  const book = (user) =>
    createAppointment(doctor, user, { from: 120 + ++bookings * 60 }).then(
      () => ({}),
      (error) => ({ error, fn: "require_telemedicine_consent" }),
    );

  denied("a guest can't accept", await accept(null, [terms]));
  denied(
    "a guest can't withdraw",
    await withdraw(null, "telemedicine-consent"),
  );
  denied(
    "a guest can't record a consent",
    await record(null, patient.id, [terms]),
  );
  denied(
    "a user can't record a consent for someone",
    await record(other, patient.id, [terms]),
  );
  denied(
    "a user can't write the table directly",
    await as(
      patient,
      `insert into public.user_consents (user_id, document, version)
       values ($1, 'terms', '1.0')`,
      [patient.id],
    ),
  );
  denied(
    "a user can't clear a withdrawal directly",
    await as(patient, `update public.user_consents set withdrawn_at = null`),
  );

  refused(
    "an empty list is refused",
    inSaveConsents(await accept(patient, [])),
    "invalid_consent",
  );
  refused(
    "an unknown document is refused",
    inSaveConsents(
      await accept(patient, [{ document: "made-up", version: "1.0" }]),
    ),
    "invalid_consent",
  );
  refused(
    "a malformed version is refused",
    inSaveConsents(
      await accept(patient, [{ document: "terms", version: "latest" }]),
    ),
    "invalid_consent",
  );
  refused(
    "an entry with no version is refused",
    inSaveConsents(await accept(patient, [{ document: "terms" }])),
    "invalid_consent",
  );
  check("refused lists save nothing", (await rowsFor(patient.id)).length === 0);

  refused("booking needs the consent", await book(patient), "consent_required");
  refused(
    "nothing to withdraw yet",
    await withdraw(patient, "telemedicine-consent"),
    "not_consented",
  );

  succeeded(
    "the server records consent at sign-up",
    await record(server, other.id, [terms]),
  );
  const [signUpAudit] = await auditFor(other.id, "consent.accepted");
  check(
    "sign-up consent is logged against the account",
    signUpAudit?.actor_id === other.id &&
      signUpAudit?.actor_role === "patient" &&
      signUpAudit?.details.document === "terms" &&
      signUpAudit?.details.version === "1.0",
    JSON.stringify(signUpAudit),
  );

  succeeded(
    "a person accepts documents",
    await accept(patient, [terms, telemedicine]),
  );
  check("both are stored", (await rowsFor(patient.id)).length === 2);
  succeeded("accepting again is harmless", await accept(patient, [terms]));
  check(
    "accepting again adds no row or log entry",
    (await rowsFor(patient.id)).length === 2 &&
      (await auditFor(patient.id, "consent.accepted")).length === 2,
  );
  succeeded(
    "a new version is a new row",
    await accept(patient, [{ document: "terms", version: "1.1" }]),
  );
  check(
    "the earlier version stays on record",
    (await rowsFor(patient.id)).filter((row) => row.document === "terms")
      .length === 2,
  );

  const { data: own } = await as(
    patient,
    `select user_id from public.user_consents`,
  );
  check(
    "people read only their own consents",
    own?.length === 3 && own.every((row) => row.user_id === patient.id),
    JSON.stringify(own),
  );
  denied(
    "guests can't read consents",
    await as(null, `select id from public.user_consents`),
  );

  refused(
    "the Terms can't be withdrawn on their own",
    await withdraw(patient, "terms"),
    "not_withdrawable",
  );
  succeeded("a consented patient books", await book(patient));
  refused(
    "a booked visit has to be cancelled first",
    await withdraw(patient, "telemedicine-consent"),
    "upcoming_appointments",
  );
  check(
    "the refused withdrawal changes nothing",
    (await rowsFor(patient.id)).every((row) => row.withdrawn_at === null),
  );

  await db.query(
    `update public.appointments set status = 'cancelled' where patient_id = $1`,
    [patient.id],
  );
  succeeded(
    "with no visits booked, the consent is withdrawn",
    await withdraw(patient, "telemedicine-consent"),
  );
  const withdrawn = (await rowsFor(patient.id)).find(
    (row) => row.document === "telemedicine-consent",
  );
  check("the row is kept and marked", withdrawn?.withdrawn_at !== null);
  const [withdrawAudit] = await auditFor(patient.id, "consent.withdrawn");
  check(
    "the withdrawal is logged",
    withdrawAudit?.actor_id === patient.id &&
      withdrawAudit?.details.document === "telemedicine-consent",
    JSON.stringify(withdrawAudit),
  );
  refused(
    "a withdrawn patient can't book",
    await book(patient),
    "consent_required",
  );

  succeeded(
    "the consent can be given again",
    await accept(patient, [telemedicine]),
  );
  check(
    "giving it again adds a row",
    (await rowsFor(patient.id)).filter(
      (row) => row.document === "telemedicine-consent",
    ).length === 2,
  );
  succeeded("and booking works again", await book(patient));
}

async function testEveryRefusalIsTested() {
  section("Every refusal has a test (QA-02)");

  const { rows } = await db.query(`
    select p.proname as name, p.prosrc as source
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
  `);

  const missing = rows.flatMap(({ name, source }) =>
    [...source.matchAll(/raise exception '([a-z_]+)'/g)]
      .map((match) => `${name}:${match[1]}`)
      .filter((key) => !refusalsSeen.has(key)),
  );

  check(
    `all ${refusalsSeen.size} refusals are exercised`,
    missing.length === 0,
    [...new Set(missing)].join(", "),
  );
}

const globalGuestFunctions = [];
const globalGuestTables = [];

// Fresh patients per group, so one group's visits can't overlap another's.
const freshPatients = async () => ({
  patient: await createPatient(),
  secondPatient: await createPatient(),
  thirdPatient: await createPatient(),
});

try {
  await testDirectory(await freshPatients());
  await testBooking(await freshPatients());
  await testCancel(await freshPatients());
  await testOutcome(await freshPatients());
  await testSchedule(await freshPatients());
  await testCalls(await freshPatients());
  await testPrescriptions(await freshPatients());
  await testVisitSummaries(await freshPatients());
  await testPatientDocuments(await freshPatients());
  await testVerification(await freshPatients());
  await testReview(await freshPatients());
  await testLabVerification(await freshPatients());
  await testLabCatalog(await freshPatients());
  await testHomeCollection(await freshPatients());
  await testLabBooking(await freshPatients());
  await testCareRecipients(await freshPatients());
  await testDoctorMedicalProfiles(await freshPatients());
  await testFamilyMembers(await freshPatients());
  await testPatientAddresses(await freshPatients());
  await testPatientProfile(await freshPatients());
  await testSecondFactor(await freshPatients());
  await testRecoveryCodes(await freshPatients());
  await testSecurityAudit(await freshPatients());
  await testRateLimits(await freshPatients());
  await testNotifications(await freshPatients());
  await testTimeOff(await freshPatients());
  await testReminders();
  await testReminderRetries();
  await testReminderSchedule();
  await testMedicineReminderSettings();
  await testNotificationPreferences();
  await testMessaging();
  await testMedicineReminders();
  await testConsents();
  await testUpgrade();
  await testReminderUpgrade();
  await testSchemaRules();
  await testEveryRefusalIsTested();
} catch (error) {
  failures++;
  console.log(`ABORTED: ${error.stack ?? error.message}`);
} finally {
  await db.close();
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
