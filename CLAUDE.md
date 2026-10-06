# MedEase

Healthcare app. Next.js App Router, TypeScript, Tailwind v4, shadcn/ui (Base UI).

@AGENTS.md

## Commands

- `npm run dev` / `npm run build`
- `npm run lint` and `npm run typecheck` must pass before committing

## Structure

- `src/app/` routes only; pages compose feature components and stay thin
- `src/features/<name>/` all code for one feature (`components/`, `actions/`, `schemas/`, `data/`)
- `src/components/ui/` shadcn primitives, added via `npx shadcn@latest add <name>`, don't hand-edit
- `src/components/shared/` components used by 2+ features
- `src/components/layout/` app shell

## Rules

- Build every feature from small reusable components, one per kebab-case file. Reuse existing components before creating new ones.
- Server Components by default; `"use client"` only on the smallest interactive leaf.
- Mutations via Server Actions, validated with Zod on the server.
- Base UI uses the `render` prop, not `asChild`. Style links as buttons with `buttonVariants()`.
- Use theme tokens (`bg-primary`, `text-muted-foreground`), never hex colors. Support dark mode and mobile.
- Patient data is sensitive: never log it, put it in URLs, or store it client-side. Enforce auth on the server.
- Commit messages: short, imperative, no co-author or tool attribution lines.
