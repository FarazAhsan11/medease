# MedEase

Healthcare app. Next.js App Router, TypeScript, Tailwind v4, shadcn/ui (Base UI).

@AGENTS.md

Planned work and milestones: `docs/roadmap.md`. Chat feature designs: `docs/chat.md`.
Requirements, plan and progress: `docs/srs.md`. When work builds or fixes a requirement, update its status there, name its ID in the commit message, and run `npm run srs -- --write`.

## Commands

- `npm run dev` / `npm run build`
- `npm run lint` and `npm run typecheck` must pass before committing

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

## Supabase

- Env vars are documented in `.env.example`; real values go in `.env.local` (gitignored). Read them only through `src/lib/env.ts` (public) and `src/lib/env.server.ts` (secrets).
- Use `@/lib/supabase/server` in Server Components and Actions, `@/lib/supabase/client` in Client Components. `@/lib/supabase/admin` bypasses RLS: server-only, and only after an explicit permission check.
- `src/proxy.ts` refreshes the auth session. Protect data with RLS policies, not just UI checks.
- A user's role (`patient` | `doctor` | `lab`) lives in Supabase `app_metadata.role`, which only the secret key can write. Never trust `user_metadata` for roles.
- Call `requireRole()` from `@/lib/auth/session` in every dashboard layout and before any data access; the proxy redirect is only optimistic.
- `npm run db:seed` creates/updates the demo accounts, profiles and doctor hours (password from `SEED_USER_PASSWORD` in `.env.local`).
- Appointments: patients book slots generated from doctors' weekly hours by `get_doctor_slots`. Booking, cancelling, outcomes and schedule saves go through SECURITY DEFINER functions (`supabase/migrations/*_appointments.sql`, latest `get_doctor_slots` / `book_appointment` in `*_booking_fixes.sql`) that check the caller; exclusion constraints stop overlapping bookings for a doctor or a patient. Only doctors in `doctor_directory` (today: email confirmed) are listed or bookable; slots and booking read through it. Times display in the doctor's timezone via `src/lib/datetime.ts`.
- Prescriptions: doctors issue them per appointment (from its start until 14 days after) through `issue_prescription` / `cancel_prescription` (`supabase/migrations/*_prescriptions.sql`); edits create a new version that replaces the active one, one active per appointment. Patients and doctors only read. Course and dosing rules live in `src/features/prescriptions/lib/prescriptions.ts`. Design: `docs/prescriptions.md`.
- Video calls: WebRTC peer to peer; Supabase Realtime private channel `call:<appointment id>` carries signaling, guarded by `can_join_call` policies on `realtime.messages` (participants only, from 5 min before the start until 15 min after the slot ends, at least 30 min after the start: `call_closes_at` in SQL, `CALL_WINDOW` in the app). Engine in `src/features/video-call/lib/call-connection.ts`. Optional TURN via `TURN_*` env vars.
- Auth emails are ours, not Supabase's: accounts are created with the admin API, and confirmation/reset tokens are generated, hashed into `auth_tokens`, and checked in `src/features/auth/lib/auth-tokens.ts`. Emails go out through Nodemailer (`SMTP_*` vars); templates live in `src/features/auth/emails/`.

## Rules

- Build every feature from small reusable components, one per kebab-case file. Reuse existing components before creating new ones.
- Server Components by default; `"use client"` only on the smallest interactive leaf.
- Mutations via Server Actions, validated with Zod on the server.
- Base UI uses the `render` prop, not `asChild`. Style links as buttons with `buttonVariants()`.
- Use the theme tokens in `globals.css` (`bg-primary`, `bg-card`, `text-muted-foreground`, `bg-success-soft`), never hex colors. Add a token when a new color is needed.
- Keep the type scale restrained: page titles `text-2xl`/`text-3xl font-semibold`, card titles `text-sm`/`text-base font-semibold`, body `text-sm`. Support mobile.
- Patient data is sensitive: never log it, put it in URLs, or store it client-side. Enforce auth on the server.
- Commit messages: short, imperative, no co-author or tool attribution lines.
