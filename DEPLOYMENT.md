# Deploying EZTab

This walks through a clean deployment from an empty Supabase account and
an empty Vercel account to a working production app on a `*.vercel.app`
URL, followed by connecting `eztab.com` once you own it. Each step says
what you're doing and why, not just the command to run.

Total time for a first deploy: roughly 20–30 minutes, most of it waiting
for Supabase to provision.

## Prerequisites

- A [Supabase](https://supabase.com) account (the free tier is enough
  to start).
- A [Vercel](https://vercel.com) account.
- Node.js **20.9 or later** locally (`node --version`) — this matches
  Next.js 16's minimum, and is set in `package.json`'s `engines` field.
- This repository pushed to a GitHub repo (Vercel's Git integration is
  the easiest deploy path — see Step 5 for the alternative if you'd
  rather not use GitHub).

---

## Step 1 — Create the Supabase project

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New
   project**.
2. Name it (`eztab` or `eztab-production` are both fine), set a strong
   database password (save it somewhere — you won't need it for
   anything in this guide, but you will if you ever connect a SQL
   client directly), and pick a region close to your users (for an
   Egypt-based audience, an EU region — e.g. Frankfurt — will generally
   be faster than a US one).
3. Wait for provisioning to finish (a couple of minutes).
4. **Settings → API** — you'll need three values from this page
   throughout the rest of this guide:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` — click "Reveal"
     to see it. This key bypasses every RLS policy in the database
     (see `supabase/README.md`). Treat it like a root password: it
     goes into Vercel's environment variables and nowhere else — never
     into a client-side file, a screenshot, or a commit.

## Step 2 — Apply the database schema

All of the app's tables, functions, and policies live in
`supabase/migrations/` as plain SQL files, applied in filename order.

**Using the Supabase CLI (recommended):**

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>   # found in the project's Settings → General
npx supabase db push
```

This applies all 16 migration files in order. You should see each one
listed as applied with no errors.

**Without the CLI:** open the Supabase dashboard's **SQL Editor**, and
run each file in `supabase/migrations/` in filename order (they're
timestamp-prefixed, so sorting alphabetically is sorting chronologically).
Paste one file's contents, run it, confirm no errors, move to the next.
Sixteen files, a couple of minutes total.

> **Already deployed before the two-template change?** The Statistics page
> returns an error until migration `20260927000100_print_templates_and_income_period.sql`
> has run — it adds the `admin_income_period()` RPC the page depends on and
> converts `print_template` to one row per card type. Run just that file in
> the SQL Editor; it preserves the existing design as the `profile` template.

Either way, when it's done, **Table Editor** should show `cards`,
`profiles`, `profile_links`, `card_edit_links`, `card_purchases`,
`analytics_events`, and `rate_limits`. The `cards` table should also have
`price_egp` and `sold_at` columns (added by the income/edit-link
migration), and `card_purchases` holds the buy-receipt rows that drive
the Statistics page's stock and profit figures.

## Step 3 — Configure Authentication

This step has two parts, and **both matter for real security** — see
`supabase/README.md`'s Security section for the full reasoning.

### 3a. Disable public sign-up

**Authentication → Sign In / Providers** → turn **off** "Allow new
users to sign up".

EZTab has exactly one admin account and no registration flow in the
app itself, but Supabase projects allow public sign-up by default. The
database's Row Level Security policies are written to reject any
account that doesn't carry the admin claim (Step 3b), so this toggle
is a second, independent layer — not the only thing standing between
a stranger and your data, but worth doing anyway.

### 3b. Create the admin account

There is no registration UI — this script is the only way an admin
account gets created, and it's meant to be run once per environment.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJ... \
ADMIN_EMAIL_DOMAIN=eztab.internal \
node scripts/create-admin-user.mjs <username> <password>
```

- Use the **service_role key** from Step 1, not the anon key — only
  the service role can set the `app_metadata.role: "admin"` claim that
  actually makes this account an admin (a user can edit their own
  `user_metadata`, but never `app_metadata`).
- `<username>` is exactly what you'll type into the EZTab login
  screen — the script maps it to an internal email
  (`<username>@eztab.internal` by default) that Supabase Auth uses
  behind the scenes; see `lib/auth/admin-email.ts`.
- `<password>` needs to be at least 10 characters.
- Keep `ADMIN_EMAIL_DOMAIN` consistent between this script and the
  app's own environment variables (Step 6) — if they ever differ, the
  login screen will map the username to a different email than the
  one the account was actually created with, and sign-in will fail.

Run this again with a new username/password if you ever need to
rotate the admin credential — it's an idempotent `createUser` call, not
a one-time setup step tied to project creation.

## Step 4 — Verify Storage

The `profile-images` bucket is created by the migrations in Step 2, not
by hand. Confirm it in **Storage**: you should see a `profile-images`
bucket marked **Public**, with a 5MB file size limit and JPEG/PNG/WebP
listed under allowed MIME types (set by the security-hardening
migration). Nothing to configure here — just worth confirming it's
there before you rely on it.

## Step 5 — Deploy to Vercel

### Option A: Git integration (recommended)

1. Push this repo to GitHub if it isn't already there.
2. [vercel.com/new](https://vercel.com/new) → import the repo. Vercel
   detects Next.js automatically — no build settings to change.
3. **Before the first deploy**, consider naming the Vercel project
   something predictable (e.g. `eztab`) — on a personal account this
   makes your production URL `https://eztab.vercel.app`, which you can
   then set as `NEXT_PUBLIC_APP_URL` *before* deploying instead of
   after (see the note in Step 6 about why this variable is special).
4. Add the environment variables from Step 6, then deploy.
5. Every push to your main branch redeploys production automatically
   from here on; every pull request gets its own preview deployment.

### Option B: Vercel CLI (no GitHub required)

```bash
npm install -g vercel
vercel login
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add ADMIN_EMAIL_DOMAIN production
vercel --prod
```

## Step 6 — Environment variables reference

Set these in **Vercel → Project → Settings → Environment Variables**
for the **Production** environment (and Preview too, if you want
preview deployments to work against the same Supabase project — most
teams do, since there's no staging database in this setup).

| Variable | Value | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL from Step 1 | Public — safe in the browser bundle |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key from Step 1 | Public — this is what RLS exists to make safe |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key from Step 1 | **Server-only.** Never prefix with `NEXT_PUBLIC_`. `lib/supabase/admin.ts` enforces this can't leak into a Client Component at build time. |
| `NEXT_PUBLIC_APP_URL` | Your production URL, e.g. `https://eztab.vercel.app` | See the callout below — this one is easy to get wrong |
| `ADMIN_EMAIL_DOMAIN` | e.g. `eztab.internal` | Must match what you passed to `create-admin-user.mjs` in Step 3b |

> **`NEXT_PUBLIC_APP_URL` is inlined at build time, not read at
> runtime.** Every `NEXT_PUBLIC_*` variable gets baked directly into
> the JavaScript bundle when `next build` runs — Vercel does not
> re-read it on every request. If you change this variable in the
> Vercel dashboard after a deploy, **nothing changes until the next
> build**. This matters most for the eztab.com cutover in Step 8: set
> the variable, then trigger a new deployment (a git push, or
> "Redeploy" in the Vercel dashboard) — the QR generator, NFC-copy
> links, and canonical URLs all read this value, so a stale build
> means stale URLs everywhere that uses it.

## Step 7 — Post-deploy verification

Work through this once after every fresh deploy:

1. Visit your production URL — it should redirect to `/admin`, which
   redirects to `/login` since you're not signed in yet.
2. Sign in with the username/password from Step 3b.
3. **Admin → Cards → Create card** — make a test Profile card, fill in
   a name, save.
4. On the card's detail page: confirm the QR code renders with the
   EZTab logo centered, and **Download QR** actually downloads an
   `.svg` file.
5. Open the card's public URL (`Copy Profile URL`, or the QR itself)
   in a private/incognito window — you should see the polished public
   profile, not the admin UI.
6. Back in **Admin → Analytics**, refresh — the view you just generated
   should show up (analytics recording happens via a deferred
   background call, so it may take a few seconds to appear).
7. Toggle dark/light mode and English/Arabic (confirm the layout
   actually mirrors under Arabic, not just the text) on both the admin
   and public pages.
8. **Admin → Statistics** — the income page should load with this
   month selected. Back on the test card, tick **Sold** and enter a
   price; the card should then appear in the Statistics table and its
   price should be added to the month's total, and the **Income &
   profit** figures should update.
9. On **Admin → Statistics**, add a **purchase receipt** (quantity,
   total cost, date) and confirm the **Blank stock**, **Spent on cards**
   and **Profit** figures update, and the day/week/month switch
   re-renders the chart. Try uploading a profile photo larger than 5MB
   (on the card's detail page) to confirm the raised Server Action body
   limit works — it should compress and save instead of erroring.
10. On the same test card, under **Customer edit link**, click **Create
    edit link**, copy the URL, and open it in a private/incognito
    window. You should get a customer-facing "Update your profile" page
    with a 30-minute countdown. Make a change, confirm it saves, then
    press **Save & close** — the link should immediately stop working
    when reopened.
11. **Admin → Tools** — paste a Google Maps share link for a business
    (e.g. `https://maps.app.goo.gl/...`) and click **Generate**; it
    should return a `search.google.com/local/writereview?...` URL.
12. Deactivate the test card once you're done — there's no delete UI by
    design (see `supabase/README.md`), so an unwanted test card either
    stays inactive or gets removed directly in the Supabase dashboard's
    Table Editor.

## Step 8 — Connecting eztab.com later

Nothing in the app hardcodes `eztab.vercel.app` or any other domain —
every card URL, QR payload, and piece of SEO metadata is built from
`NEXT_PUBLIC_APP_URL` (see `lib/cards/urls.ts`). Connecting the real
domain is a configuration change, not a code change:

1. **Vercel → Project → Settings → Domains** → add `eztab.com` (and
   `www.eztab.com` if you want both).
2. Update your DNS at the domain registrar with whatever records
   Vercel's UI shows you (typically an `A` record for the apex domain
   and a `CNAME` for `www`). This step happens outside Vercel, at
   wherever `eztab.com` is registered.
3. Wait for DNS to propagate and Vercel to issue the SSL certificate
   (usually a few minutes, occasionally longer depending on your
   registrar).
4. Update `NEXT_PUBLIC_APP_URL` to `https://eztab.com` in Vercel's
   environment variables, then **trigger a new deployment** — per the
   callout in Step 6, the old value is baked into whatever was last
   built until you do.

**Existing physical cards keep working.** Vercel serves the app at
both the `.vercel.app` URL and the custom domain simultaneously, so
any card already printed and out in the world with a `vercel.app` QR
code or NFC payload keeps resolving correctly — reprinting is a
branding choice at that point, not something the cutover requires.

## Troubleshooting

- **Build fails on Vercel with a missing environment variable error** —
  double check all five variables from Step 6 are set for the
  **Production** environment specifically (Vercel scopes variables per
  environment; a variable added only to Preview won't be there for a
  production build).
- **Login always says "Incorrect username or password", even with the
  right credentials** — the two most common causes: `ADMIN_EMAIL_DOMAIN`
  in Vercel doesn't match what you passed to `create-admin-user.mjs`
  (Step 3b), or "Allow new users to sign up" is still on and you
  actually created a *different*, non-admin account by the same
  username through some other path — the admin script is the only
  supported way to create the account that matters.
- **Signed in, but every admin page shows no data / looks empty** —
  this is the signature of a session that exists but lacks the admin
  claim (see `supabase/README.md`'s security notes on `is_admin()`).
  Confirm the account was created via `create-admin-user.mjs`, not
  through Supabase's own sign-up flow.
- **QR codes download but photo uploads fail** — check Step 4; if the
  `profile-images` bucket or its policies are missing, migration
  `20260925000800_storage.sql` or `20260925001200_security_hardening.sql`
  didn't apply. Re-run `supabase db push` or paste the missing file(s)
  into the SQL Editor.
- **Analytics numbers seem to be missing recent activity** — view
  recording happens via Next.js's `after()`, which runs once the
  response has already been sent; it's typically near-instant but
  isn't guaranteed to land before your very next page refresh.
