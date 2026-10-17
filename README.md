# EZTab

NFC/QR-linked digital business cards. Next.js (App Router) + TypeScript +
Tailwind CSS v4, on Supabase (Postgres, Auth, Storage) and Vercel.

## Status

All 11 build stages are complete: architecture, database, auth, the
admin dashboard, cards, profiles, the public card route, analytics, a
security-hardening pass (see "Security" below), and deployment
documentation. **See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the full,
step-by-step path from an empty Supabase/Vercel account to a live
production deployment** — Supabase project setup, database migrations,
auth configuration, environment variables, the Vercel deploy itself,
a post-deploy verification checklist, and connecting `eztab.com` once
it's purchased.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project's values

# Apply the schema — see supabase/README.md for details
npx supabase link --project-ref <your-project-ref>
npx supabase db push

# One-time: create the single admin account (see scripts/create-admin-user.mjs)
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  node scripts/create-admin-user.mjs <username> <password>

npm run dev
```

Open http://localhost:3000 — it redirects to `/admin`, which redirects to
`/login` until you sign in with the username/password from the step above.

## Architecture notes

- **No locale-prefixed routes.** Card URLs (`/card/{cardId}`) are printed
  on physical NFC/QR hardware and can never change shape, so the active
  language lives in a `NEXT_LOCALE` cookie (set in `proxy.ts`, read in
  `i18n/request.ts`) instead of a `/en` or `/ar` URL segment.
- **`proxy.ts`, not `middleware.ts`.** This project is on Next.js 16,
  which renamed the middleware convention to Proxy. `node_modules/next/dist/docs`
  is the version-matched source of truth — check it before assuming a
  Next.js API from training data still applies.
- **Three Supabase clients**, in `lib/supabase/`: `client.ts` (browser,
  anon key), `server.ts` (RSC/Route Handlers, anon key + session cookies,
  RLS-bound), and `admin.ts` (service role, server-only, bypasses RLS —
  used sparingly, e.g. for cross-table uniqueness checks during card ID
  generation).
- **Username, not email, at login.** The UI collects a username (spec
  requirement), but Supabase Auth needs an email — `lib/auth/admin-email.ts`
  maps one to the other deterministically. `scripts/create-admin-user.mjs`
  is the only way an admin account gets created; there's no registration
  UI.
- **`proxy.ts` does double duty**: it refreshes the Supabase session on
  every request (required by `@supabase/ssr`) and redirects
  unauthenticated requests away from `/admin/**`. `app/admin/layout.tsx`
  re-checks the session anyway — a Server Component shouldn't assume it
  was reached through the proxy unchanged.
- **Design tokens** live in `app/globals.css` as CSS custom properties,
  sampled from the supplied logo (`public/brand/logo.png`), and are
  exposed to Tailwind v4 via `@theme inline`. Dark mode is a deliberately
  tuned second palette (its background is the logo's own near-black,
  `#06070E`), not an inverted light mode.

## Security

- **Admin identity is `app_metadata.role = "admin"`**, not just having a
  Supabase session — see `supabase/README.md` for why that distinction
  matters, and `lib/auth/require-admin.ts` / `lib/auth/roles.ts` for
  where the app checks it (every Server Action, every admin Route
  Handler, `proxy.ts`, and `app/admin/layout.tsx` all check
  independently — no single layer is trusted alone).
- **Visitor click tracking goes through `/api/track`**, not straight to
  Supabase from the browser — validated with Zod, rate-limited per IP.
  Page views are recorded server-side via `after()`, also rate-limited.
  Both use `lib/security/rate-limit.ts`, a Postgres-backed fixed-window
  counter (serverless has no shared memory for an in-process one) keyed
  by an HMAC hash of the IP, never the raw address.
- **Profile photo uploads are verified by their actual file bytes**
  (`lib/storage/profile-images.ts`), not by the filename or the
  browser-supplied Content-Type — both are just claims an attacker
  controls. The Storage bucket itself also enforces the size/type limits
  Supabase-side.
- **A `Content-Security-Policy` and related headers** are set in
  `next.config.ts` for every response. It isn't a nonce-based "strict"
  CSP — Next's and next-themes' inline scripts need `'unsafe-inline'`
  for now — but it does stop framing (clickjacking), `<object>`/`<embed>`
  content, and restricts image/connect origins to Supabase Storage only.
- **Every URL a visitor can be sent to** (profile links, website, Google
  Maps, Google Review) is checked for an `http(s)://` scheme both in Zod
  (`lib/validation/cards.ts`) and as a database `CHECK` constraint — so a
  `javascript:` URL can't reach a rendered link even via a direct SQL
  edit that bypassed the app entirely.
- **Every one of the above was verified with real HTTP requests**, not
  just reasoning about the code: I ran the actual PostgREST binary (what
  Supabase runs) against a fully-migrated local database with real
  signed JWTs for an anonymous visitor, a self-registered non-admin
  account, the real admin, and the service role, and confirmed each
  gets exactly the access it should — including that a self-registered
  account with a forged `user_metadata.role: "admin"` (the one claim a
  user can set on their own account) still gets refused everywhere.

## Environment variables

See `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` must never be prefixed
with `NEXT_PUBLIC_` or referenced from a Client Component — `lib/supabase/admin.ts`
enforces this at build time via the `server-only` package.

## Moving to eztab.com

Nothing in the app hardcodes a domain — card URLs, QR payloads, and
metadata all read `NEXT_PUBLIC_APP_URL`. Pointing the app at `eztab.com`
is a Vercel domain + environment-variable change, not a code change.
