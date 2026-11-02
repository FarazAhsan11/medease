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

- Password forms: they submit through `onSubmit`, so a click before hydration falls back to a native GET and puts the email and password in the URL, where Vercel's logs can see them. Seen on `/login` during the consent test. Give every form holding a password `method="post"`.
- SUP-02: the contact form is still not wired (Send does nothing). Needs `support_tickets`, the mailer and `rateLimits.contactIp`. Then ADM-11.
- SUP-07: re-read the patient and doctor overviews for leftover mock cards (lab results card, recent messages), and remove the unused `src/components/icons/social-icons.tsx`.
- SEC-05: rate limit document uploads. AUTH-07: bot protection.
- Then the rest of Phase 0: AUTH-05, SEC-06, ADM-04, CALL-03, NTF-04, OBS-01.

**Waiting on you or others**: REL-01 and REL-02 (paid Supabase, staging). CMPL-03: counsel reviews the five legal documents, which finishes SUP-01. Points to raise:

- The documents speak as MedEase and name no legal company. Counsel needs the registered name and country, which may also change the choice of Pakistani law and courts.
- The Contact page shows only a phone number and hours, and its form doesn't send (SUP-02), yet the Privacy Policy tells people to contact us to use their rights. Add a support email.
- The 18+ account rule is in the Terms but sign-up doesn't check age.
- Retention periods are promises ahead of the code: only notifications and the reminder log purge automatically today (PRV-05).
- Deletion and data export are by email until AUTH-05 and AUTH-08 exist.
- The 72-hour breach target has no plan behind it yet (PRV-07).
- Google receives email content: moving off Gmail (NTF-04) changes the provider table. A TURN relay (CALL-03) adds a provider too.

Last updated: 2026-11-02

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

### 1b. Medicine reminders by email (next)

Remind patients to take their medicines at the times their doctor set (morning, afternoon, night), using the prescription data from item 1.

- **Schedule**: a scheduled job runs three times a day, once per dose time (e.g. 08:00, 14:00, 21:00 in the patient's timezone; the clinic timezone stored on the prescription until patients have their own). Each run gathers, per patient, the medicines due at that time today using the same course rules as the app (`getCourse`: daily every day, weekly on the start weekday, as-needed never, finished courses skipped) and sends one email per patient listing that time's doses.
- **Runner**: `pg_cron` and `pg_net` calling a protected Route Handler (secret header), the same way as appointment reminders (REL-07). The handler reads with the admin client (it runs without a user), so it must only ever read due doses and the patient's own email.
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
