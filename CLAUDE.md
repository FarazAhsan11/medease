# MedEase

Healthcare app. Next.js App Router, TypeScript, Tailwind v4, shadcn/ui (Base UI).

@AGENTS.md

## Commands

- `npm run dev` / `npm run build`
- `npm run lint` and `npm run typecheck` must pass before committing

## Structure

- `src/app/` routes only; pages compose feature components and stay thin
  - `(site)/` public pages with the marketing header and footer
  - `(dashboard)/patient|doctor|lab/` role dashboards inside `DashboardShell`; each role's nav lives in `src/config/dashboards.ts`
  - Signed-in tasks (booking, calls, AI chat, ordering) live inside the role's dashboard so the UI never switches layouts; link to them via `src/config/routes.ts`. Public pages only browse.
- `src/features/<name>/` all code for one feature (`components/`, `actions/`, `schemas/`, `data/`)
- `src/components/ui/` shadcn primitives, added via `npx shadcn@latest add <name>`, don't hand-edit
- `src/components/shared/` components used by 2+ features
- `src/components/layout/` app shells: site header/footer and dashboard sidebar/topbar
- Static mock data lives in each feature's `data/` folder until the backend is connected

## Supabase

- Env vars are documented in `.env.example`; real values go in `.env.local` (gitignored). Read them only through `src/lib/env.ts` (public) and `src/lib/env.server.ts` (secrets).
- Use `@/lib/supabase/server` in Server Components and Actions, `@/lib/supabase/client` in Client Components. `@/lib/supabase/admin` bypasses RLS: server-only, and only after an explicit permission check.
- `src/proxy.ts` refreshes the auth session. Protect data with RLS policies, not just UI checks.
- A user's role (`patient` | `doctor` | `lab`) lives in Supabase `app_metadata.role`, which only the secret key can write. Never trust `user_metadata` for roles.
- Call `requireRole()` from `@/lib/auth/session` in every dashboard layout and before any data access; the proxy redirect is only optimistic.
- `npm run db:seed` creates/updates the demo accounts (password from `SEED_USER_PASSWORD` in `.env.local`).

## Rules

- Build every feature from small reusable components, one per kebab-case file. Reuse existing components before creating new ones.
- Server Components by default; `"use client"` only on the smallest interactive leaf.
- Mutations via Server Actions, validated with Zod on the server.
- Base UI uses the `render` prop, not `asChild`. Style links as buttons with `buttonVariants()`.
- Use the theme tokens in `globals.css` (`bg-primary`, `bg-card`, `text-muted-foreground`, `bg-success-soft`), never hex colors. Add a token when a new color is needed.
- Keep the type scale restrained: page titles `text-2xl`/`text-3xl font-semibold`, card titles `text-sm`/`text-base font-semibold`, body `text-sm`. Support mobile.
- Patient data is sensitive: never log it, put it in URLs, or store it client-side. Enforce auth on the server.
- Commit messages: short, imperative, no co-author or tool attribution lines.
