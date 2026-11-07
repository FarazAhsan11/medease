# Roadmap

## Next session (left open 2026-11-02)

Requirement status is in [srs.md](./srs.md).

**You need to do**

1. Know that demo doctor and lab logins now must pair an authenticator app.
2. Check `ci.yml` is green on GitHub. That finishes QA-01.

**Live tested 2026-11-02**

- AUTH-03, CMPL-02 and PRV-02 work on production: sign-up for all three roles stores the right documents; existing accounts stop at `/consent`, with no way round it; a changed version asks for that document only; a withdrawn patient keeps the account, can't book, and can give consent again. Doctors meet two-factor first. PRV-02 stays Partial for AI-04, REC-03 and PRO-04. Two-factor followed by a doctor's dashboard wasn't driven with a paired app. Demo accounts will meet `/consent` at their next login.
- REL-07 works: the 17:00 UTC scheduled run returned `200` with `{"claimed":0,"emailed":0}`, and production refuses a wrong secret with `401`. Nothing was due, so no reminder email has gone through this path yet. The first real one will show in `net._http_response`. A failed send and a failed mark were tested against stand-in database and mail servers.

**Live tested 2026-11-01** (throwaway accounts, two browser sessions, dev and production builds)

- NTF-01 works and is Built. It was broken: the bell joined Realtime as `anon` and was refused without any visible error, so nothing arrived live until a reload.
- APT-04 works: slots vanish and return, the affected booking is listed, cancelling tells the patient live. Stays Partial for refunds (needs payments) and rescheduling.
- APT-05 works: one claim, one send, a second run sends nothing, and the bell updates live. The mail server accepted the email; nobody has looked at it in an inbox. Stays Partial for other channels (NTF-03) and a join link.
- SEC-02 is Built: no blocks in development; in production only Zod's harmless probe.
- Calls: about 1 call in 5 to 10 stuck on "Connecting" with no error, when an ICE candidate arrived before the offer. Fixed: 30 of 30 calls connected, in both join orders, and 6 of 6 patient refreshes reconnected.

**Finish next**

- MED-01, MED-02: live since `d43b21f`, and the scheduled job reaches the route (the 18:15 UTC run on 2026-11-02 answered `{"claimed":0,"emailed":0}`). Still to see: a due reminder in a real inbox, from a test patient with an active prescription and a reminder time just ahead. Then mark MED-01 Built, and MED-02 Partial for the other channels, and move to Milestone 2 item 2. In `net._http_response` read the body, not the status: cron calls carry an `Authorization` header, and with one a missing route answers 200 with the not-found page instead of 404.
- The Phase 0 items below wait until close to launch (decided 2026-11-02), except ADM-04 before labs.
- Upload safety is done for records (2026-11-03): SEC-05's upload limit and SEC-06's checks are built and live-tested through doctor verification (GPS stripped with rotation kept; HTML sent as a PDF and a PNG named `.jpg` both refused and deleted; the limit refuses the 21st batch). REC-02 must use `verifyUpload` and `rateLimits.uploadUser` the same way. SEC-06 stays Partial for malware scanning, needed before REC-03 shares files with doctors.
- REC-01 visit summaries are built (2026-11-03) and live-tested on the dev server against the real database: the doctor writes, edits and is refused outside the 14-day window; the patient sees the summary on the visit card and gets an in-app notice (no email, since a summary carries a diagnosis). Needs `20261103120000_visit_summaries.sql`, already run.
- REC-02 documents are built and live-tested (2026-11-04) on the dev server against the real database, with throwaway accounts: a PDF and a JPEG upload, HTML named `.pdf` is refused and deleted, files open on a 1-minute signed link that carries no name, a guest goes to login and another patient gets 404, delete removes the row and the file, the audit log has each add and delete, and the page fits 375px. `20261104120000_patient_documents.sql` is applied. Decided 2026-11-04: only the patient sees their documents until REC-03 sharing, which waits for SEC-06 malware scanning. Files left in `incoming/` by an upload that never finished aren't cleaned up yet, and deleting an account (AUTH-05) must remove the patient's files from Storage.
- REC-04 timeline is built (2026-11-04) and live-tested with a throwaway patient and doctor: past visits (with their summary's diagnosis and follow-up), prescriptions and documents in one list on `/patient/records`, newest first, grouped by month, filtered by `?type=`. Cancelled, missed and upcoming visits stay out. It stays Partial: lab reports join with labs (Milestone 2 item 5), and choosing whose timeline (care recipients) comes with dependents (APT-09). No migration.
- REC-05 patient chart is built (2026-11-04) and live-tested with throwaway doctors and patients: `/doctor/patients/[patientId]` shows one doctor's visits with a patient (newest first, including cancelled and upcoming), each with the reason, the summary, the prescription and the private notes, and Details opens the usual appointment sheet. It opens only for a patient the doctor has seen (a visit that has taken place); a patient with only a booking, another doctor's patient and a bad id all get the not-found page, and another doctor's visits and notes never appear. The patients list has an "Open chart" link for seen patients. It stays Partial: shared documents join with REC-03 and lab results with labs. No migration. Also fixed: long emails no longer widen the patients list and chart on phones.
- Next in Milestone 2 item 2: REC-03 sharing and PRO-08 wait for SEC-06 malware scanning, which needs a decision on the scanner.
- PRO-02 is built (2026-11-06) and tested end to end on the dev server against the real database, with throwaway accounts. A patient saves allergies, conditions and medicines in settings. Their doctor then sees them in the appointment details, in a sheet on the call screen, on the prescription page (left out of the printout) and on the patient chart. A later edit shows up on the doctor's next page load. A doctor whose only booking with someone was cancelled sees nothing. Pages fit 375px. `20261106120000_doctor_medical_profiles.sql` is applied.
- PRO-03 family screens, APT-09 and FIX-15 are built (2026-11-06) and tested end to end on the dev server against the real database, with throwaway accounts. A patient adds, edits and removes family members in settings (date of birth required, 10 at most; someone with visits or records can't be removed). The booking page asks who the visit is for once there is anyone to choose, and the same doctor can be booked for the holder and a child at once, while a second upcoming visit for the same person is refused. Appointments and prescriptions keep the treated person's name and relation as booked, shown to the patient ("For Aliya Khan") and the doctor (name, plus "Sara Khan's child"), on the printout and the call screen. Another account can't book for someone else's family member. Pages fit 375px. `20261106150000_family_members.sql` is applied. PRO-03 stays Partial: records and prescriptions by person, lab reports, and the doctor's per-person list and chart. Next in item 3: PRO-05 and PRO-07.
- PRO-05 email settings are built (2026-11-07) and tested end to end on the dev server against the real database, with throwaway accounts and a fake SMTP server, so no real mail went out. Patients turn appointment reminder and prescription emails on or off in settings; doctors turn booking and cancellation emails on or off on their profile. Account, security, verification and the patient's own booking emails always go, and the bell always gets every update. With the doctor's emails off, a booking and a cancellation sent the patient's confirmation but nothing to the doctor, whose bell still had both; turned back on, the next booking emailed them. The reminder job skips emails a patient turned off, and doesn't send a skipped one later if they turn emails back on (covered in test:sql, not called live because the local route would claim real patients' reminders). Pages fit 375px. `20261107120000_notification_preferences.sql` is applied. NTF-07 is Partial: quiet hours wait for the NTF-05 outbox, and other channels for NTF-06. Next in item 3: PRO-07, best built with home collection or delivery, which use it.
- Done 2026-11-03 (PRV-01): every form submitted through `onSubmit` now has `method="post"`, so a click before hydration posts to the page (which just renders it again) instead of putting passwords, codes or clinical fields in the URL. Keep it on new forms. PRV-01 stays Partial: the doctor's patient search still puts a patient's name in the URL as `?q=`.
- SUP-02: the contact form is still not wired (Send does nothing). Needs `support_tickets`, the mailer and `rateLimits.contactIp`. Then ADM-11.
- SUP-07: re-read the patient and doctor overviews for leftover mock cards (lab results card, recent messages), and remove the unused `src/components/icons/social-icons.tsx`.
- SEC-05: the contact form (with SUP-02). AUTH-07: bot protection.
- Then the rest of Phase 0: AUTH-05, ADM-04, CALL-03, NTF-04, OBS-01.

**Waiting on you or others**: REL-01 and REL-02 (paid Supabase, staging). CMPL-03: counsel reviews the five legal documents, which finishes SUP-01. Points to raise:

- The documents speak as MedEase and name no legal company. Counsel needs the registered name and country, which may also change the choice of Pakistani law and courts.
- The Contact page shows only a phone number and hours, and its form doesn't send (SUP-02), yet the Privacy Policy tells people to contact us to use their rights. Add a support email.
- The 18+ account rule is in the Terms but sign-up doesn't check age.
- Retention periods are promises ahead of the code: only notifications and the reminder log purge automatically today (PRV-05).
- Deletion and data export are by email until AUTH-05 and AUTH-08 exist.
- The 72-hour breach target has no plan behind it yet (PRV-07).
- Google receives email content: moving off Gmail (NTF-04) changes the provider table. A TURN relay (CALL-03) adds a provider too.

Last updated: 2026-11-07

## Reminder scheduler (REL-07, built 2026-11-02)

GitHub Actions used to call `/api/cron/appointment-reminders` every 15 minutes. GitHub turns off scheduled workflows after 60 days without repo activity, so reminders could stop with no warning. Supabase starts the job instead.

The route stays. It sends email with Nodemailer, which the database can't do, so only the trigger moves. `pg_cron` runs the schedule and `pg_net` makes the HTTP call.

### Build

**1. Retry failed emails.** Today a reminder is claimed before its email goes out, so a failed send is lost and the run still returns 200.

- Add `emailed_at` and `last_attempt_at` to `appointment_reminders`, plus `attempts` (default 0). Set `emailed_at = sent_at` on existing rows so old reminders aren't sent again.
- `claim_appointment_reminders()` still calls `private.notify` only on the first insert. It also returns rows with no `emailed_at`, fewer than 3 attempts, no attempt in the last 10 minutes, and an appointment that is still `booked` and in the future. A 24-hour reminder isn't retried inside the last hour, because it says "tomorrow". It updates `attempts` and `last_attempt_at` on every row it returns, so overlapping runs can't send the same email twice.
- Add `mark_appointment_reminder_emailed(appointment_id, kind)` for `service_role` only.
- In the route, add `appointment_id` to `DueReminder`, mark each email that was sent, and return 502 with the counts if any failed.

**2. Add the trigger.** The migration `*_reminder_schedule.sql`:

```sql
create or replace function private.request_appointment_reminders()
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_site_url text;
  v_secret text;
begin
  select decrypted_secret into v_site_url
  from vault.decrypted_secrets where name = 'reminders_site_url';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'reminders_cron_secret';

  -- A database without these secrets, such as staging, sends nothing.
  if v_site_url is null or v_secret is null then
    return;
  end if;

  perform net.http_get(
    url := v_site_url || '/api/cron/appointment-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 120000
  );
end;
$$;

revoke execute on function private.request_appointment_reminders() from public;

select cron.schedule(
  'appointment-reminders',
  '*/15 * * * *',
  'select private.request_appointment_reminders()'
);
```

- Set the timeout as above. `pg_net` defaults to 2 seconds, which is too short for sending email.
- Don't put `create extension` in the migration. `npm run test:sql` runs on PGlite, which has neither extension, so they're enabled in the dashboard.
- Never put a secret in a migration: this repo is public.

**3. Test it.** In `SUPABASE_STUBS` (`scripts/lib/test-database.mjs`), add `cron`, `net` and `vault` schemas with stand-ins that record their calls. In `scripts/test-sql.mjs` check that:

- without secrets, no request is made
- with secrets, the URL, header and timeout are right
- the job is scheduled every 15 minutes
- a failed email is sent again, with no second notification
- cancelled, past and fully emailed reminders are skipped, and retries stop after 3 attempts

### Switch over

1. Push this code, then set `CRON_SECRET` on Vercel and redeploy. This must come before the migration: the older route never marks emails as sent, so each reminder would go out three times.
2. In Supabase, go to Database > Extensions and enable `pg_cron` and `pg_net`.
3. Store the secrets in the SQL Editor, using the production address and the same `CRON_SECRET`. These lines stay out of the repo. To change a value later, use `vault.update_secret`.

   ```sql
   select vault.create_secret('https://medease-5elw.vercel.app', 'reminders_site_url');
   select vault.create_secret('<CRON_SECRET value>', 'reminders_cron_secret');
   ```

4. Run `20261102090000_reminder_schedule.sql` in the SQL Editor.
5. After the next quarter hour, check the real result. Expect `200` and `{"claimed":0,"emailed":0}` when nothing is due.

   ```sql
   select status_code, content, timed_out, error_msg, created
   from net._http_response
   order by created desc
   limit 5;
   ```

6. Delete `.github/workflows/reminders.yml`.
7. Set REL-07 to Built and run `npm run srs -- --write`. APT-05 stays Partial for other channels and a join link.

### Know before relying on it

- `cron.job_run_details` only shows that the SQL ran, so it can say `succeeded` when the route failed. The HTTP result is in `net._http_response`, kept for 6 hours.
- Nothing alerts anyone yet if runs stop or fail. That's REL-04 and OBS-03.
- An email that goes out but can't be marked as sent is sent again, so a patient may rarely get a duplicate. That's the chosen side: a duplicate is better than a missed reminder.
- While a request waits to go out, `pg_net` holds the secret in `net.http_request_queue`, where any role that can log in to the database can read it.
- A new Supabase project needs both extensions enabled before this migration, or the migration fails. Each project also needs its own Vault secrets; staging should point at staging or have none.

**Done when**: a due reminder arrives from a scheduled run with GitHub Actions removed, a wrong secret gets 401, a forced email failure is retried with only one in-app notice, and `npm run test:sql`, `npm run lint` and `npm run typecheck` pass.

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

### 1b. Medicine reminders by email (live, 2026-11-02; awaiting a first real reminder)

Remind patients at the times they choose (morning, afternoon, night), using the prescription data from item 1.

- **Schedule**: `pg_cron` job `medicine-reminders` calls `/api/cron/medicine-reminders` every 15 minutes through `pg_net`, with the same Vault secrets as appointment reminders. `claim_medicine_reminders()` decides what's due in the database.
- **Due**: from the patient's chosen time, in their timezone, until an hour later. A dose reminder hours late could lead someone to double up, so a late one is dropped. `private.has_dose_due` repeats `getCourse` on the clinic's calendar, so a reminder agrees with what the app shows that day.
- **No duplicates**: `medicine_reminders` has one row per patient, day and dose time, inserted before sending. A failed email is retried, 3 tries at most, 10 minutes apart, inside the same hour, while the dose is still due and reminders are still on.
- **Patient control**: opt-in, off by default, in patient settings. Every email has an unsubscribe link that works signed out; the token does nothing else, and turning off takes a click because mail scanners open links.
- **Privacy**: one generic email, "Time for your morning medicines", with a link to the app. It never names a medicine (decided 2026-11-02), so there's no setting for that.
- **Family**: reminders go to the account holder, whoever the medicine is for.
- **Later**: other channels, in-app notifications, and "mark as taken" tracking (MED-03).
- **Done when**: a patient who opted in gets one email at each dose time, never twice, and none after a course ends or a prescription is cancelled.

### 2. Visit summaries and health records

Visit summaries are built (REC-01, 2026-11-03): `visit_summaries` with `save_visit_summary`, written in the doctor's appointment details in the same window as a prescription, shown on the patient's visit card, with an in-app notice and audit entries.

Documents are built (REC-02, 2026-11-04): `patient_documents` with `add_patient_document` and `delete_patient_document`, a private `patient-documents` bucket, and a real documents table on `/patient/records` (upload, open, delete). The browser uploads to `<patient id>/incoming/` on a signed link; the server runs `verifyUpload` and moves the file out, and the database records only files outside `incoming/`, so a direct call can't record an unchecked file. Files open through `/patient/records/documents/[id]`, which reads the row with the patient's session and redirects to a one-minute signed link. Only the patient sees them; doctors get access with REC-03.

The timeline is built (REC-04, 2026-11-04) from the existing loaders, under the documents on `/patient/records`. A visit shows its summary rather than a separate entry.

The doctor's patient chart is built (REC-05, 2026-11-04) at `/doctor/patients/[patientId]`, from the same loaders filtered to one patient, so row level security keeps it to the doctor's own records. Shared documents join it with REC-03.

- **Database**: add a patient-visible summary next to the private notes (diagnosis, advice, follow-up date), e.g. a `visit_summaries` table, so private notes stay doctor-only. `patient_documents` table plus a private Storage bucket, with paths under the patient's id.
- **Doctor UI**: summary fields in the appointment details sheet; per-patient history (past visits, summaries, prescriptions) from the patients list.
- **Patient UI**: real `/patient/records` with visit history and document upload/download (`documents-table`). Downloads use short-lived signed URLs.
- **Done when**: the patient sees a summary for each completed visit and can upload a report that their doctor can open.

### 3. Patient profile and settings

The profile saves for real (PRO-01), and doctors see it (PRO-02, 2026-11-06): a policy on `care_recipients` lets a doctor read the profile of anyone with a booking with them that wasn't cancelled. The doctor-side view lives in `src/features/medical-profile/`.

- **Database**: extend `patient_profiles` with date of birth, gender, blood group, allergies, chronic conditions, emergency contact.
- **UI**: `personal-info-form` saves for real; `medical-summary-card` on records reads it; doctors see allergies and conditions in the appointment details and during a call.
- **Done when**: a patient updates allergies in settings and the doctor sees them on the next appointment.

### 4. Doctor–patient messaging

Real conversations between a patient and the doctors they have booked with, replacing the mock doctor inbox. Full design in [chat.md](./chat.md#doctorpatient-messaging).

- **Done when**: a patient messages their doctor, the doctor sees it live with an unread badge, and replies.
- **Built 2026-11-07 (MSG-01 to MSG-04)** and tested end to end on the dev server against the real database, with throwaway accounts: a patient opens a conversation from an appointment, the doctor's header badge and overview update live, both sides see "Seen" receipts live, another patient can't read, send or join the private channel, and the doctor's close, extend and the 7-day window all hold in the browser and the database. Live updates are Broadcast on one private `user:<id>` channel per person, sent by the database functions, with no polling. `20261107150000_messaging.sql` is applied. Left: the bell still uses Postgres Changes and should move onto `user:<id>`; MSG-05 onward (attachments, quick replies, auto reply, report abuse) are not started.

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
