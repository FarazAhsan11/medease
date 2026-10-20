# Roadmap

Last updated: 2026-10-20

## Milestone 1: Foundations (done)

- **Auth**: patient, doctor and lab sign-up, sign-in, sign-out, email confirmation, forgot/reset/change password. Accounts are created with the admin API; our own tokens (`auth_tokens`) and emails (Nodemailer). Role in `app_metadata.role`.
- **Doctor directory**: public and patient find-doctor pages read real doctor profiles.
- **Appointments**: slots from doctors' weekly hours (`get_doctor_slots`), booking, cancelling, outcomes (completed / no-show), schedule editing, booking emails, add to calendar. All writes go through SECURITY DEFINER functions; double-booking blocked by a partial unique index.
- **Doctor dashboard**: overview, appointments with details sheet and private notes, patients list, availability, profile editing.
- **Video calls**: WebRTC peer to peer, signaling over the private Realtime channel `call:<appointment id>`, join window enforced by `can_join_call`.
- **Patient dashboard**: overview and appointments are real.

Still mock (feature `data/` folders): health records, patient settings form, medicines, lab tests and orders, doctor messages, AI chat, the lab dashboard except its overview, and the contact form.

## Milestone 2: Close the care loop

Goal: after a visit, the patient gets something back (prescription, summary, records), patients and doctors can talk, and labs can run real bookings. Work through the items in order; each one ships on its own and must pass `npm run lint` and `npm run typecheck`.

Every item follows the existing patterns: a migration in `supabase/migrations/`, RLS on every table, writes through SECURITY DEFINER functions that check the caller, `requireRole()` before data access, Server Actions validated with Zod, and no patient data in logs or URLs.

### 1. Prescriptions (built, 2026-10-20)

Doctors write, edit (as a new version) and cancel prescriptions for an appointment from its start until 14 days after; patients see current medicines, today's doses and every prescription, printable, with email notices. Full design and rules in [prescriptions.md](./prescriptions.md). Needs the migration `20261020120000_prescriptions.sql` run on the database.

### 1b. Medicine reminders by email (next)

Remind patients to take their medicines at the times their doctor set (morning, afternoon, night), using the prescription data from item 1.

- **Schedule**: a scheduled job runs three times a day, once per dose time (e.g. 08:00, 14:00, 21:00 in the patient's timezone; the clinic timezone stored on the prescription until patients have their own). Each run gathers, per patient, the medicines due at that time today using the same course rules as the app (`getCourse`: daily every day, weekly on the start weekday, as-needed never, finished courses skipped) and sends one email per patient listing that time's doses.
- **Runner**: Vercel Cron calling a protected Route Handler (secret header), or Supabase `pg_cron` + an Edge Function. The handler reads with the admin client (it runs without a user), so it must only ever read due doses and the patient's own email.
- **No duplicates**: a `medication_reminders_sent` table (patient, date, dose time), unique, inserted before sending, so a retried or overlapping run never emails twice.
- **Patient control**: reminders are opt-in per patient (a setting with on/off and preferred times), with an unsubscribe link in every email. Off by default until the patient turns it on.
- **Privacy decision**: an email listing medicine names reveals health information to anyone who can read the inbox. Options: list names (most useful, needs the patient's explicit opt-in) or send a generic "Time for your evening medicines" with a link to the app. Decide before building.
- **Later**: in-app notifications (the header bell is still mock data) and "mark as taken" tracking.
- **Done when**: a patient who opted in gets one email at each dose time listing exactly the medicines due then, never twice, and none after a course ends or a prescription is cancelled.

### 2. Visit summaries and health records

- **Database**: add a patient-visible summary next to the private notes (diagnosis, advice, follow-up date), e.g. a `visit_summaries` table, so private notes stay doctor-only. `patient_documents` table plus a private Storage bucket, with paths under the patient's id.
- **Doctor UI**: summary fields in the appointment details sheet; per-patient history (past visits, summaries, prescriptions) from the patients list.
- **Patient UI**: real `/patient/records` with visit history and document upload/download (`documents-table`). Downloads use short-lived signed URLs.
- **Done when**: the patient sees a summary for each completed visit and can upload a report that their doctor can open.

### 3. Patient profile and settings

- **Database**: extend `patient_profiles` with date of birth, gender, blood group, allergies, chronic conditions, emergency contact.
- **UI**: `personal-info-form` saves for real; `medical-summary-card` on records reads it; doctors see allergies and conditions in the appointment details and during a call.
- **Done when**: a patient updates allergies in settings and the doctor sees them on the next appointment.

### 4. Doctor–patient messaging

Real conversations between a patient and the doctors they have booked with, replacing the mock doctor inbox. Full design in [chat.md](./chat.md#doctorpatient-messaging).

- **Done when**: a patient messages their doctor, the doctor sees it live with an unread badge, and replies.

### 5. Lab tests: catalog, bookings and reports

- **Database**: `lab_tests` (per-lab catalog, price, preparation notes, home collection), `lab_bookings` (patient, lab, tests, slot, address for home collection, status `booked → sample_collected → processing → report_ready`), `lab_reports` (PDF in a private Storage bucket).
- **Lab UI**: manage the test catalog, move bookings through statuses, upload a report; the bookings, tests, reports and profile pages become real.
- **Patient UI**: browse real tests, book with `lab-booking-form`, follow progress in `order-tracker`, download the report from records.
- **Done when**: a patient books a test, the lab uploads the report, and the patient downloads it.

### 6. AI health assistant (Talk to AI)

Make the existing `chat` feature (UI only today) a real symptom-guidance assistant that points patients to the right specialist and lets them book. Full design in [chat.md](./chat.md#ai-health-assistant).

- **Done when**: a signed-in patient describes symptoms, gets streamed answers with safety messaging, and is shown matching doctors from our directory.

## Later

- **Doctor reviews**: patients rate a completed appointment; makes the directory's `rating-badge` real.
- **Appointment reminders**: email before an appointment, on the same scheduled job as medicine reminders (item 1b).
- **Medicines ordering**: cart, checkout and fulfilment; needs a payment provider decision.
- **Contact form**: send through the existing mailer.
- **Branding cleanup**: the chat UI still says "CareDoc"; rename to MedEase.
