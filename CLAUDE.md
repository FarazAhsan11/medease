# MedEase

Healthcare app. Next.js App Router, TypeScript, Tailwind v4, shadcn/ui (Base UI).

@AGENTS.md

Planned work and milestones: `docs/roadmap.md`. Chat feature designs: `docs/chat.md`.
Requirements, plan and progress: `docs/srs.md`. When work builds or fixes a requirement, update its status there, name its ID in the commit message, and run `npm run srs -- --write`.

## Commands

- `npm run dev` / `npm run build`
- `npm run lint` and `npm run typecheck` must pass before committing
- `npm run test:sql` applies every migration to a throwaway in-memory Postgres and tests each database rule; no Docker, network or Supabase project needed. Add tests here for every new function: it fails on any `raise exception` without a test
- `npm run test:db` tests what needs real Supabase services (Auth, two-factor, Storage) on the project in `.env.local`, with temporary accounts

## Keeping sessions small

- `docs/srs.md` is about 60k tokens. Never read it whole or @-mention it: use `npm run srs -- --phase 0` and search for an ID. `scripts/test-sql.mjs` is about 20k: search it and read only the section needed.
- Filter command output to what matters (`npm run test:sql` prints every pass; keep only failures and the total).
- In browser tests, read the page with a script, and take a screenshot only to check how something looks.
- Write a file once, with small edits after. Don't draft large content in a scratch file and then write it again.
- One feature per session. Start the next with `/clear`; `docs/roadmap.md` and memory carry the state.

## Structure

- `src/app/` routes only; pages compose feature components and stay thin
  - Every page renders inside one `AppShell` (root layout): the same top header and footer for guests and signed-in users. Guests get the public links; signed-in users get their role's links from `src/config/dashboards.ts`.
  - `(site)/` public pages. Guests can only browse; actions (booking, AI chat, ordering) send them to log in.
  - `(dashboard)/patient|doctor|lab/` signed-in role areas, guarded by `requireRole()` in each layout.
  - Signed-in tasks (booking, calls, AI chat, ordering) live in the role's area; link to them via `src/config/routes.ts`. The proxy sends signed-in users from `/` to their dashboard and patients from public feature pages to their own version.
- `src/features/<name>/` all code for one feature (`components/`, `actions/`, `schemas/`, `data/`)
- `src/components/ui/` shadcn primitives, added via `npx shadcn@latest add <name>`, don't hand-edit
- `src/components/shared/` components used by 2+ features
- `src/components/layout/` the app shell: header, nav, user menu, footer
- Static mock data lives in each feature's `data/` folder until the backend is connected
- Legal pages are data in `src/features/legal/data`, one file per document. They describe only what exists: when a feature, provider or data type changes, update the document and raise its `version` if the meaning changed. The provider table in `privacy-policy.ts` must match what's really in use.

## Supabase

- Env vars are documented in `.env.example`; real values go in `.env.local` (gitignored). Read them only through `src/lib/env.ts` (public) and `src/lib/env.server.ts` (secrets).
- Use `@/lib/supabase/server` in Server Components and Actions, `@/lib/supabase/client` in Client Components. `@/lib/supabase/admin` bypasses RLS: server-only, and only after an explicit permission check.
- `src/proxy.ts` refreshes the auth session. Protect data with RLS policies, not just UI checks.
- A user's role (`patient` | `doctor` | `lab` | `admin`) lives in Supabase `app_metadata.role`, which only the secret key can write. Never trust `user_metadata` for roles.
- Call `requireRole()` from `@/lib/auth/session` in every dashboard layout and before any data access; the proxy redirect is only optimistic. It also enforces two-factor: doctors, labs and admins always, patients once they've paired an app. The database applies the same rule to clinical data (`private.second_factor_ok`, a restrictive policy plus a write trigger on each table), so add both to any new clinical table. `/two-factor` serves every role.
- Care recipients: the person treated isn't assumed to be the account holder. Family members are added in patient settings through `save_family_member` / `delete_family_member` (`*_family_members.sql`), and `book_appointment` takes `p_care_recipient_id`. Appointments and prescriptions snapshot `care_recipient_name` and `care_recipient_relation`; `patient_name` stays the account holder, who books and gets the emails. Show the treated person with `careRecipientName` and `bookedByLabel` / `BookedForBadge` (`src/features/family/`). Clinical tables carry `care_recipient_id` next to `patient_id`, paired by a foreign key to `care_recipients`, so a record can't name someone from another account. Contact details stay on `patient_profiles`, the medical profile on the person's `care_recipients` row. A doctor reads that row while they have a booking with the person that wasn't cancelled (PRO-02); the doctor's view is in `src/features/medical-profile/`.
- Notifications: triggers write `notifications` rows (a kind and a link, no text); wording is in `src/features/notifications/lib/notifications.ts`. Reminders run from `/api/cron/appointment-reminders`, called every 15 minutes by the `pg_cron` job `appointment-reminders` through `pg_net`, with `CRON_SECRET` held in Supabase Vault (not Vercel Cron, which is daily on Hobby). A reminder is retried until `mark_appointment_reminder_emailed` records it, up to 3 tries. `net._http_response` shows the real result, not `cron.job_run_details`.
- Rate limits go through `isRateLimited()` in `@/lib/rate-limit.server` (shared across servers via `hit_rate_limit`, hashed identifiers). Security events go through `recordSecurityEvent()`.
- Doctor verification: doctors start `pending` and stay out of `doctor_directory` until an admin approves them. Admins come only from `npm run admin:create`; `private.is_admin()` needs the role and an `aal2` session, and admin pages use the admin's own session, not the secret key. Sensitive actions go in the append-only `audit_log` through `private.write_audit`, ids only. Large files go straight from the browser to Storage on signed upload links, never through a Server Action (Vercel's 4.5 MB limit). Count each batch of links with `rateLimits.uploadUser`, and check every file after upload with `verifyUpload` (`@/lib/uploads/verify-upload.server`): it reads the type from the bytes, strips photo metadata and deletes a file that fails. Design: `docs/verification.md`.
- Consent: `user_consents` keeps a row per accepted version of a legal document; `requiredConsents` (`src/features/consent/lib/consent-documents.ts`) says who needs what, and versions come from `src/features/legal/data`. Sign-up records them in `createAccount`, and `requireRole()` sends anyone with a missing or outdated document to `/consent`, so raising a `version` asks everyone again. Only the telemedicine consent can be withdrawn by itself (patient settings, booked visits cancelled first); a trigger on `appointments` refuses a booking without it, and a withdrawal stands until the patient gives it again. A new document needs the table's check, `requiredConsents` and `ConsentDocumentLink`.
- `npm run db:seed` creates/updates the demo accounts, profiles and doctor hours (password from `SEED_USER_PASSWORD` in `.env.local`).
- Appointments: patients book slots generated from doctors' weekly hours by `get_doctor_slots`. Booking, cancelling, outcomes and schedule saves go through SECURITY DEFINER functions (`supabase/migrations/*_appointments.sql`, latest `get_doctor_slots` / `book_appointment` in `*_booking_fixes.sql`) that check the caller; exclusion constraints stop overlapping bookings for a doctor or a patient. Only doctors in `doctor_directory` (today: email confirmed) are listed or bookable; slots and booking read through it. Times display in the doctor's timezone via `src/lib/datetime.ts`.
- Prescriptions: doctors issue them per appointment (from its start until 14 days after) through `issue_prescription` / `cancel_prescription` (`supabase/migrations/*_prescriptions.sql`); edits create a new version that replaces the active one, one active per appointment. Patients and doctors only read. Course and dosing rules live in `src/features/prescriptions/lib/prescriptions.ts`. Design: `docs/prescriptions.md`.
- Visit summaries: what the patient sees after a visit (diagnosis, advice, follow-up date), kept apart from the doctor's private `appointment_notes`. Written only through `save_visit_summary` (`*_visit_summaries.sql`), in the same window as a prescription; a trigger sends an in-app notice and audit entry, never an email. Code in `src/features/visit-summaries/`.
- Medicine reminders: opt-in email at each dose time from `/api/cron/medicine-reminders`, called every 15 minutes by the `pg_cron` job `medicine-reminders` with the same Vault secrets as appointment reminders. `claim_medicine_reminders` decides what's due; `private.has_dose_due` must stay in step with `getCourse`. A reminder is due for one hour, then dropped. Emails are generic, and the unsubscribe token works signed out and only turns reminders off.
- Video calls: WebRTC peer to peer; Supabase Realtime private channel `call:<appointment id>` carries signaling, guarded by `can_join_call` policies on `realtime.messages` (participants only, from 5 min before the start until 15 min after the slot ends, at least 30 min after the start: `call_closes_at` in SQL, `CALL_WINDOW` in the app). Only the consultation pages allow the camera (`Permissions-Policy` in `next.config.ts`), and browsers read that on a full page load, so enter them with a plain `<a>`, never `Link`. Engine in `src/features/video-call/lib/call-connection.ts`. Optional TURN via `TURN_*` env vars.
- Realtime: `await supabase.realtime.setAuth()` before joining any channel that RLS guards. Without it the join goes out as `anon` and is refused with no visible error.
- Auth emails are ours, not Supabase's: accounts are created with the admin API, and confirmation/reset tokens are generated, hashed into `auth_tokens`, and checked in `src/features/auth/lib/auth-tokens.ts`. Emails go out through Nodemailer (`SMTP_*` vars) after the response, so a failed send drops the token and the person uses Resend; templates live in `src/features/auth/emails/`. Every email link starts from `getSiteUrl()` (`SITE_URL`, checked at startup in `src/instrumentation.ts`), never from request headers.

## Rules

- Build every feature from small reusable components, one per kebab-case file. Reuse existing components before creating new ones.
- Any page that waits on the server gets a `loading.tsx` using `PageSkeleton` (`@/components/shared/page-skeleton`): it shows the page straight away and lets dynamic routes prefetch. `NavigationProgress` in the shell covers every link and GET form with no extra code; GET forms use `Form` from `next/form`.
- Server Components by default; `"use client"` only on the smallest interactive leaf.
- Mutations via Server Actions, validated with Zod on the server.
- Base UI uses the `render` prop, not `asChild`. Style links as buttons with `buttonVariants()`.
- Use the theme tokens in `globals.css` (`bg-primary`, `bg-card`, `text-muted-foreground`, `bg-success-soft`), never hex colors. Add a token when a new color is needed.
- Keep the type scale restrained: page titles `text-2xl`/`text-3xl font-semibold`, card titles `text-sm`/`text-base font-semibold`, body `text-sm`. Support mobile.
- Patient data is sensitive: never log it, put it in URLs, or store it client-side. Enforce auth on the server.
- Emails, calendar files and flash messages never carry the doctor's name or specialty, a visit or cancellation reason, a diagnosis or medicines; subjects and inbox previews name no one. Link to the app, where details sit behind sign-in.
- Commit messages: short, imperative, no co-author or tool attribution lines.
