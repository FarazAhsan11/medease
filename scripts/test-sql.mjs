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

async function testVerification({ patient }) {
  section("Doctors send documents (FIX-07, ADM-02)");

  const doctor = await createDoctor({ status: "pending" });
  const save = (caller, paths) =>
    rpc(caller, "save_verification_documents", paths);
  const licensePath = `${doctor.id}/license.pdf`;

  succeeded(
    "a doctor saves a document",
    await save(doctor, { p_license_path: licensePath }),
  );
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
    await save(doctor, { p_license_path: `${randomUUID()}/license.pdf` }),
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
    await save(asked, { p_degree_path: `${asked.id}/degree.pdf` }),
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
  const review = (caller, doctorId, decision, note) =>
    rpc(caller, "admin_review_doctor", {
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
    "a doctor doesn't read them yet",
    (await as(doctor, recipients)).data?.length === 0,
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
      p_license_path: `${newDoctor.id}/license.pdf`,
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
  await testVerification(await freshPatients());
  await testReview(await freshPatients());
  await testCareRecipients(await freshPatients());
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
