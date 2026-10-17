# Supabase schema

## Applying the migrations

**Via the Supabase CLI (recommended):**

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

**Via the SQL editor** (no CLI): open each file in `migrations/`, in filename
order, and run it in the Supabase Dashboard's SQL editor.

After applying, generate real TypeScript types to replace the
hand-written `types/database.ts`:

```bash
npx supabase gen types typescript --project-id <your-project-ref> > types/database.ts
```

## What's in here

| File | Purpose |
| --- | --- |
| `20260925000100_extensions_and_enums.sql` | `pgcrypto`, `pg_trgm`, the `card_type` / `card_status` / `analytics_event_type` enums |
| `20260925000200_tables.sql` | `cards`, `profiles`, `profile_links`, `analytics_events` |
| `20260925000300_indexes.sql` | Lookup/search/dashboard indexes |
| `20260925000400_updated_at_triggers.sql` | Auto-maintained `updated_at` |
| `20260925000500_card_id_generator.sql` | `generate_unique_card_id()` — admin-only |
| `20260925000600_public_rpc_functions.sql` | `get_card_for_display()`, `record_analytics_event()` — the entire anonymous-visitor surface area |
| `20260925000700_rls_policies.sql` | RLS + grants: `authenticated` (the one admin) gets full table access, `anon` gets none |
| `20260925000800_storage.sql` | `profile-images` bucket + policies |
| `20260925000900_admin_analytics_functions.sql` | `admin_get_daily_activity()` — zero-filled per-day views/clicks for any date range, optionally scoped to one card |
| `20260925001000_admin_card_list.sql` | `admin_list_cards()` — the Cards table's search/filter/pagination query with per-card view/click counts |
| `20260925001100_analytics_dashboard_functions.sql` | `admin_global_totals()`, `admin_top_links()`, `admin_top_cards()`, `admin_card_click_breakdown()` — the Analytics page's aggregates |
| `20260925001200_security_hardening.sql` | `is_admin()` + rewritten RLS/storage policies gated on it, URL `CHECK` constraints, storage bucket limits, `rate_limits` table + `rate_limit_hit()`, revokes `anon`'s direct `record_analytics_event` access |
| `20260925001300_income_and_edit_links.sql` | `cards.price_egp` / `cards.sold_at` + the `admin_income_monthly()` / `admin_income_cards()` reports; `card_edit_links` table for time-boxed customer edit sessions |
| `20260926000100_card_purchases.sql` | `card_purchases` table (buy receipts) + `admin_inventory_overview()` (stock, cost, profit), `admin_income_series()` (zero-filled day/week/month income/cost/profit) and `admin_income_period()` (current day/month/year income, cost, profit, cards sold) |
| `20260926000200_print_template.sql` | `print_template` table (print layout: design path + card ID/QR positions and sizes) + the `print-designs` Storage bucket |
| `20260927000100_print_templates_and_income_period.sql` | Adds the `admin_income_period()` RPC (current day/month/year income, cost, profit, cards sold) that the Stage 12 migration declared too late to take effect, and rebuilds `print_template` as one row per card type (`profile` / `google_review`) with a per-template `width_cm`/`height_cm` |

## Supabase Dashboard settings (not expressible in SQL)

- **Auth → Sign-in / Providers: disable "Allow new users to sign up".**
  Every RLS policy is now gated on the `app_metadata.role = "admin"` claim
  (migration `1200`), not merely on being signed in, so a self-registered
  account is already harmless — it gets zero table access and every
  admin-only RPC rejects it. Disabling sign-up is still worth doing as a
  second, independent layer, and it's the one piece of this hardening
  pass that has to be set by hand in the dashboard rather than a
  migration.
- **Auth → Rate Limits** are Supabase's own (IP-based, and from a Server
  Action that IP is Vercel's shared egress, not the visitor's) — they
  don't replace `/api/track`'s or `login()`'s app-level limiting, which
  is keyed on the real client IP.

`seed.sql` is local-dev-only fixture data (`supabase db reset`); the CLI
never applies it to a linked remote project.

## Two things worth remembering

- **`profiles.card_id` and `analytics_events.card_id` are foreign keys to
  `cards.id` (a UUID) — not the same thing as `cards.card_id` (the
  6-digit public string).** Same column name, different table, different
  meaning. Always alias in a query that touches more than one of these
  tables (`select c.card_id, ...`), or Postgres will reject it as
  ambiguous.
- **Anonymous visitors never get a table-level grant on any of the four
  tables.** The only anon-facing read is `get_card_for_display()`
  (`SECURITY DEFINER`, validates its own input). `record_analytics_event()`
  is `service_role`-only as of migration `1200` — visitor clicks reach it
  through the app's `/api/track` endpoint, not directly, so every write
  is validated and rate-limited in one place. If a future feature needs
  a new kind of anonymous access, add a narrowly-scoped `SECURITY
  DEFINER` function for it rather than opening a table-level policy to
  `anon`.
- **"Signed in" is not "admin".** RLS and every admin-only function check
  `is_admin()` — the `app_metadata.role = "admin"` claim, settable only
  with the service role — not just `to authenticated`. A Supabase project
  with public sign-up enabled would otherwise let anyone create an
  account and receive a fully-privileged session.
- **`rate_limits` is service-role-only** (RLS enabled, zero policies) and
  self-prunes — `rate_limit_hit()` opportunistically deletes rows older
  than an hour on about 1% of calls, so nothing needs to cron it.

## Local verification

This schema was applied migration-by-migration against a scratch
PostgreSQL 16 database (matching Supabase's engine) and exercised
end-to-end — RLS deny/allow for both roles, every `CHECK` constraint,
the card ID generator, and both RPC functions including their
drop-invalid-input paths — before being committed. See the migration
files' comments for the reasoning behind each non-obvious decision.
