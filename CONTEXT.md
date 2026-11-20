# EZTab — Full Project Context

> **Living document.** This file is the single source of truth for the state of
> the codebase. It is maintained by AI agents and must be **read at the start of
> every task** and **updated after every change**. The mandatory update checklist
> lives in [`AGENTS.md`](./AGENTS.md) → "Keep CONTEXT.md in sync"; the change
> history lives in [§9 Maintenance log](#9-maintenance-log) at the bottom.
> Primary instruction file: [`AGENTS.md`](./AGENTS.md) (which also carries the
> Next.js 16 `node_modules/next/dist/docs` rule). Other handoff docs:
> [`BUSINESS_BRIEF.md`](./BUSINESS_BRIEF.md) (product/business),
> [`README.md`](./README.md) (local setup + security),
> [`DEPLOYMENT.md`](./DEPLOYMENT.md) (deploy runbook),
> [`supabase/README.md`](./supabase/README.md) (database + security model).

---

## 1. What EZTab is

EZTab sells **physical NFC + QR cards** that link to a digital business card. A
customer taps or scans the card and lands on a mobile web page — their own card:
photo/logo, name, contact actions, links, address, and a Google-review button, a
dedicated payment-methods page with a name, bio and a stack of payment links, or
a menu page with categorized items, timed discounts, and special offers. The
physical card is the product; the web page is what it points to.

- **One card = one public URL**: `eztab.com/card/{6-digit-id}`. The 6-digit
  number is printed on the hardware. **Both QR and NFC always encode that same
  stable URL, for every card type.** URLs never change shape because they are
  printed on physical hardware — this is why there is **no locale prefix** in
  any route.
- **Business model (two-sided, tracked in DB):**
  - Revenue: each `cards` row has `price_egp` + `sold_at` (admin records sales).
  - Cost: each `card_purchases` row is a **batch of blank cards bought**
    (quantity, total cost, date, note). Drives inventory and profit.
  - Dates bucket to **`Africa/Cairo`**, not UTC (the business's real day).
  - No subscriptions, no paywall, no multi-tenancy, no customer accounts.
- **Market:** Egypt-based, prices in **EGP**; InstaPay / Online Cash / Vodafone
  Cash matter; Google Maps + reviews matter for local shops. **Arabic is the
  default locale, RTL-first**; English is second. Customers are non-technical
  local shops, clinics, service providers, freelancers.
- **Status:** all 11 build stages complete; production deployment documented.
  `/` redirects to `/admin`. There is no marketing site.

### The seven card types (first-class, data-separated)

| Type | Data | Visitor experience |
|---|---|---|
| `PROFILE` | `profiles` + `profile_links` | Full personal profile page |
| `STORE_PROFILE` | `store_profiles` + `store_links` | Full store page (category, address, hours, review) |
| `MULTIPLE_PAYMENT_METHODS` | `payment_profiles` + `payment_links` | Payment page (name, bio, photo/logo, payment links) |
| `MENU` | `menu_profiles` + `menu_categories` / `menu_items` / `menu_offers` | Menu page (store-like info, categorized items, timed discounts/offers) |
| `GOOGLE_REVIEW` | `cards.target_url` only | HTTP 302 redirect |
| `INSTAPAY` | `cards.target_url` only | HTTP 302 redirect |
| `ONLINE_CASH` | `cards.target_url` only | HTTP 302 redirect |

- Redirect types store **only a URL** — no label, amount, or description.
- The four page types (`PROFILE`, `STORE_PROFILE`, `MULTIPLE_PAYMENT_METHODS`,
  `MENU`) each have their own data model and print-template kind; their
  `target_url` must be NULL. `MENU` has **two** print-template kinds
  (`menu`, `menu_alt`); the specific design is stored per card on
  `menu_profiles.print_template_kind`.
- `target_url` is constrained in the DB: page types must have it NULL, redirect
  types must have it set. Never merge type data or give a redirect card extra
  fields. New type behaviour goes through `CARD_TYPE_LABEL_KEY` so every view
  agrees on the label.
- The payment card has **no contact actions** (phone/WhatsApp/email/maps) — only
  name, bio, photo and payment links. It uses the shared `profile-images` bucket
  and `card_edit_links` table, but never `profiles` / `profile_links`.
- The menu card reuses the full store-like base fields (name, category, bio,
  contacts, address, opening hours, Google review URL) in `menu_profiles` and the
  shared `profile-images` bucket for menu/profile, item, and offer images. Menu
  structure is: categories (`name`, `sort_order`, `is_active`) → items
  (`name`, `description`, `price` text, `image_path`, `is_available`,
  `sort_order`, optional timed discount label/price/window) plus separate timed
  special offers (`title`, `description`, `image_path`, `price_text`,
  `starts_at`/`ends_at`, `is_active`, `sort_order`). Public display shows active
  in-window offers and active categories/available items; item discounts are
  shown only while active in their window. Cairo-time scheduling is used for
  timed windows. Menu items/offers are informational only (no click/tap tracking
  targets). Expired offers remain manageable by admins but are hidden publicly. Public
   prices are stored as plain numbers and rendered with the fixed Arabic EGP
   suffix `ح.م`; the admin/customer amount inputs show the same suffix. The
   public menu has clickable category chips under the headline (plus an "All"
   chip, styled transparently), and public offers show only the end date as
   `العرض مستمر حتي <date>`.
- Google Maps URLs are normalized to
  `search.google.com/local/writereview?placeid=...`; InstaPay / Online Cash URLs
  are stored verbatim.

### Card lifecycle (the core workflow)

1. Admin records a blank-card purchase batch (`card_purchases`).
2. Admin creates a card (one of seven types); a unique 6-digit ID is generated.
3. Admin prints via a per-type PDF template (QR + 6-digit ID), each with its own
   separately uploaded background design.
4. Admin records the sale (`price_egp`, `sold_at`) → revenue.
5. Visitor taps/scans → `/card/{id}`; page cards render, redirect cards 302.
6. Visitor acts — link click, call, WhatsApp, email, website, maps, save vCard,
   share, review click — each recorded as a separate analytics event.
7. Customer edits their own card **with no account**, using a time-boxed edit
   link (`/edit/{token}`, 30m / 1h / 1d / forever). No customer logins, ever.
8. Admin watches views, clicks, top links/cards, income in the dashboard.

---

## 2. Stack & configuration

- **Next.js 16.3.6** (App Router, Turbopack), **React 19.2.8**, TypeScript 5,
  Tailwind CSS v4 (CSS-first `@theme`, design tokens as CSS custom properties),
  Supabase (Postgres 17 + Auth + Storage), Vercel, domain `eztab.com`.
- Node **>= 20.9.0**. Scripts: `dev`, `build`, `start`, `lint` (ESLint 9).
- Key libraries: `next-intl`, `zod` + `react-hook-form`, `recharts`,
  `lucide-react` + `react-icons`, `pdf-lib` + `qrcode`, `react-easy-crop`,
  `sonner`, `next-themes`, `@supabase/ssr`, `server-only`.
- `@/*` maps to the repo root (`tsconfig.json`).
- `proxy.ts` **replaces the deprecated `middleware.ts`** (Next 16) and refreshes
  the Supabase session on every request. Matcher:
  `/((?!_next|api|.*\..*).*)` — `**/api` is deliberately excluded, so API routes
  self-guard.
- `next.config.ts`: `createNextIntlPlugin("./i18n/request.ts")`, global security
  headers (CSP, `X-Frame-Options: DENY`, `nosniff`, HSTS, referrer/permissions
  policies), `poweredByHeader: false`, and
  `experimental.serverActions.bodySizeLimit: "6mb"` (5MB image uploads + overhead).
- Environment (see `.env.example`, `types/env.d.ts`):
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` (server-only; `server-only` package enforces it),
  `NEXT_PUBLIC_APP_URL` (inlined at **build** time — changing it requires a
  redeploy), optional `ADMIN_EMAIL_DOMAIN` (default `eztab.internal`).

---

## 3. Architecture rules — must not be broken

1. **Public reads go through `SECURITY DEFINER` DB functions**, not direct table
   access. `anon` has essentially zero table grants; it gets exactly one card
   via `get_card_for_display()` or the footer via `get_public_site_footer()`.
   This prevents bulk scraping. For any future anonymous feature, add a narrowly
   scoped definer function — never open a table policy to `anon`.
2. **All mutations are Server Actions**, each independently re-checking admin
   identity. No single gate is trusted. Inputs are re-validated with Zod.
3. **Admin identity is `app_metadata.role = "admin"`** (`isAdminUser` /
   `is_admin()`), not merely "has a session". A self-registered account with a
   forged `user_metadata.role` is refused everywhere. Public sign-up must also
   be disabled in the Supabase dashboard as an independent layer.
4. **Visitor URLs are validated twice**: Zod (`lib/validation/`) and DB `CHECK`
   constraints (`^https?://`, <=2048 chars), so `javascript:` URLs cannot reach
   a rendered link even via direct SQL.
5. **Uploaded images are verified by actual file bytes** (`detectImageType`),
   never by filename or browser Content-Type.
6. **Migrations are hand-written, numbered SQL files** applied with
   `supabase db push`. Enum additions must live in their own isolated migration
   (Postgres cannot add and use an enum value in one transaction).
7. **Card types stay data-separated.** Redirect cards carry only `target_url`.
8. **Stable QR/NFC payload**: always `/card/{cardId}`, never the mutable
   `target_url`, so printed hardware survives destination changes.
9. **No locale in URLs** — locale is the `NEXT_LOCALE` cookie (default `ar`).
10. **Server Actions are public endpoints**: validate inputs and re-check auth
    inside every action. Client components never import a Supabase client.

---

## 4. Route map (`app/`)

All `page.tsx` / `layout.tsx` are async **Server Components**. The only
`"use client"` modules in `app/` are the two `error.tsx` boundaries. Dynamic
segments use promise-based `params: Promise<{…}>`. No route groups.

| Route | Purpose | Auth / notes |
|---|---|---|
| `/` | `redirect("/admin")` | none |
| `/login` | Sign-in card, `LoginForm` | proxy redirects admins away |
| `/admin` | Dashboard: stats, activity chart, recent cards | layout + proxy guard |
| `/admin/analytics` | Views/clicks, top links/cards, date ranges | `?range=today\|7d\|30d\|all` |
| `/admin/statistics` | Income, inventory, purchases, per-type summary | `?month=YYYY-MM&period=day\|week\|month&summary=day\|month\|year` (Cairo) |
| `/admin/settings` | Language/theme, footer social links, CTA URL, password | |
| `/admin/print-template` | Per-type print layout editor (8 kinds: 7 card types + 2nd menu design) | explicit `getAdminContext()` check |
| `/admin/cards` | Filterable/paginated card list | `?q&type&status&page` |
| `/admin/cards/new` | Create card (7 types), ID preview | |
| `/admin/cards/[cardId]` | Card detail/editor + QR + print + analytics | `?range=…` |
| `/card/[cardId]` | **Public** card page or 302 redirect | no auth; analytics in `after()` |
| `/edit/[token]` | **Public** token-scoped customer editor | token is the authorization; `force-dynamic`, noindex |
| `POST /api/track` | Public click-event ingest | Zod + rate limit, always 204 |
| `GET /api/admin/cards/[cardId]/qr` | Branded QR SVG (`?download=1`) | self-guards (401) |
| `GET /api/admin/cards/[cardId]/print` | PDF (`?template=&download=1`); MENU uses its selected design unless overridden | self-guards (401) |

### Root & shared

- `app/layout.tsx` — fonts (Ubuntu), `getLocale()/getMessages()`, `<html lang dir>`,
  root metadata (title/description plus browser tab icon pinned to
  `/favicon.svg`, the brand logo), `ThemeProvider`, `NextIntlClientProvider`,
  `sonner` Toaster (RTL-aware position).
- `app/globals.css` — Tailwind v4 `@import "tailwindcss"`, `@custom-variant dark`,
  light/dark brand tokens from the logo, per-card accent via `[data-card-accent]`
  + `--card-accent*` + `color-mix`, `@theme inline` utilities, keyframes,
  reduced-motion rules, `.link-in-bio-*`/`.profile-*` public-page styles, RTL drawer.
- `app/error.tsx`, `app/admin/error.tsx` — client boundaries wrapping `ErrorState`.
- `app/not-found.tsx`, `app/card/[cardId]/not-found.tsx` — `StatusScreen` + translations.

### Admin actions (`app/**/actions.ts`, all `"use server"`)

- `app/admin/cards/actions.ts` — largest module: `previewNewCardId`, `createCard`
  (7-way zod union, review-URL normalization, retry on unique violation 23505,
  5 attempts), `setCardStatus`, `updateCardSale`, `updateCardTheme`,
  `updateTargetUrl`, `deleteCard`, detail/link/menu CRUD/reorder and image
  upload/remove for **all four page types** (`profile` / `store` / `payment` /
  `menu`, including menu categories/items/offers and item/offer images),
  `createCardEditLink` (revokes prior open link, stores only
  `hashEditToken(token)`, allowed for all four page types),
  `closeCardEditLink`, `generateReviewLinkAction`,
   `updateMenuPrintTemplate` (selects `menu` or `menu_alt` for one MENU card).
- `app/admin/settings/actions.ts` — `changePassword` (rate-limited + re-auth),
  social link CRUD/reorder, `updateSiteSettings`.
- `app/admin/statistics/actions.ts` — `addPurchase`, `deletePurchase`.
- `app/admin/print-template/actions.ts` — `savePrintTemplate`,
  `uploadPrintDesignAction`, `removePrintDesignAction` (rollback on failure).
- `app/login/actions.ts` — `login` (per-IP rate limit 8/15min, username→email,
  admin claim check, generic errors), `logout`.
- `app/edit/[token]/actions.ts` — token-scoped actions for profile/store/
  payment/menu details, images, theme, links/menu structure, and "save & close";
  all use the service-role client scoped by `resolveEditSession`, re-check
  ownership, and rate-limit per IP/token. Menu actions cover base details/image
  plus category/item/offer CRUD, reorder, and item/offer image upload/remove;
  `CustomerEditView` bundles them into `MenuEditActions`.

### Public analytics behaviour

- **Views**: recorded server-side in `after()` on `/card/[cardId]` (non-blocking,
  also runs after `redirect()`), rate-limited per-card (10/min) and per-visitor
  (120/min), via `record_analytics_event`. Failures are logged only.
- **Clicks**: browser posts to `/api/track` with `keepalive` (`trackCardEvent`);
  validated, rate-limited 60/min (429 + `Retry-After`), recorded via the
  service-role RPC, and **always returns 204** so tracking never breaks a click.
  `linkKind` is `profile` (default), `store` or `payment`; the route maps it to
  `p_profile_link_id` / `p_store_link_id` / `p_payment_link_id`. Every link-click
  consumer (top links, click breakdown, analytics panels) unions all three link
  tables.
- Coarse metadata only: device category (UA regex), referrer **origin** only,
  hashed IPs for rate limiting. No PII stored.

---

## 5. Database (Supabase / Postgres 17)

Hand-written final schema in `types/database.ts`. Naming trap:
`profiles.card_id` / `analytics_events.card_id` are **UUID FKs to `cards.id`**,
not the 6-digit public `cards.card_id`. Always alias in multi-table joins.

### Enums (final)

- `card_type`: `PROFILE`, `GOOGLE_REVIEW`, `INSTAPAY`, `ONLINE_CASH`,
  `STORE_PROFILE`, `MULTIPLE_PAYMENT_METHODS`, `MENU` (enum additions isolated in
  their own migrations)
- `card_status`: `ACTIVE`, `INACTIVE`
- `analytics_event_type`: `VIEW`, `LINK_CLICK`, `PHONE_CLICK`, `WHATSAPP_CLICK`,
  `EMAIL_CLICK`, `WEBSITE_CLICK`, `MAPS_CLICK`, `SHARE_CLICK`,
  `SAVE_CONTACT_CLICK`, `REVIEW_CLICK`
- `card_theme` existed briefly then was dropped — `cards.theme` is now `text`.

### Tables (18 total; 17 app tables + `rate_limits`)

| Table | Key columns / notes |
|---|---|
| `cards` | `id uuid PK`, `card_id text UNIQUE` (`^[1-9][0-9]{5}$`), `type`, `status`, `target_url`, `price_egp`, `sold_at`, `theme text DEFAULT '#005cf2'` (hex CHECK). Indexes on status/type/created/sold. |
| `profiles` | 1:1 with card (`card_id uuid UNIQUE FK → cards.id CASCADE`); full_name, job_title, bio, phone, whatsapp, email, website, google_maps_url, image_path. Trigram index on full_name. |
| `profile_links` | profile_id FK CASCADE; icon/title/url (http(s) CHECK), sort_order, is_active. |
| `store_profiles` | 1:1 with card; name/category/bio/contacts/address/hours/google_review_url/website/maps/image_path. |
| `store_links` | store_profile_id FK CASCADE; same shape as profile_links. |
| `payment_profiles` | 1:1 with card (`card_id uuid UNIQUE FK → cards.id CASCADE`); `payment_image_path` (shared bucket path), `full_name`, `bio`. No contact fields. |
| `payment_links` | `payment_profile_id` FK CASCADE; icon/title/url (http(s) CHECK), sort_order, is_active. Indexed on (payment_profile_id, sort_order). |
| `menu_profiles` | 1:1 with card (`card_id uuid UNIQUE FK → cards.id CASCADE`); store-like base fields (`full_name`, `category`, `bio`, contacts, `address`, `opening_hours`, `google_review_url`, `website`, `google_maps_url`) plus `menu_image_path`. |
| `menu_categories` | `menu_profile_id` FK CASCADE; `name`, `sort_order`, `is_active`. Indexed on (menu_profile_id, sort_order). |
| `menu_items` | `category_id` FK CASCADE; `name`, `description`, `price` (text), `image_path`, `is_available`, `sort_order`, optional discount fields (`discount_label`, `discount_price`, `discount_starts_at`, `discount_ends_at`). Indexed on (category_id, sort_order). |
| `menu_offers` | `menu_profile_id` FK CASCADE; `title`, `description`, `image_path`, `price_text`, `starts_at`, `ends_at`, `is_active`, `sort_order`. Indexed on (menu_profile_id, sort_order). |
| `analytics_events` | append-only; card_id FK CASCADE, `profile_link_id` / `store_link_id` / `payment_link_id` (SET NULL), event_type, device_category, browser, os, referrer. CHECK: `LINK_CLICK` ⇔ `num_nonnulls(...) = 1`; all other events ⇒ all three NULL. Menu items/offers have no link-tracking targets. |
| `card_edit_links` | card_id FK CASCADE, `token_hash UNIQUE` (SHA-256 only), created/opened/expires/closed/revoked timestamps. |
| `card_purchases` | quantity > 0, total_cost >= 0, `purchased_on date DEFAULT Cairo-today`, note. |
| `print_template` | `kind text PK` (8 kinds: profile, google_review, instapay, online_cash, store_profile, multiple_payment_methods, menu, menu_alt), width/height cm, design_path, card_id x/y/font/color, qr x/y/size, `qr_rotation_deg` (0..360, default 0). 8 seeded rows. **No updated_at trigger** (app maintains it). |
| `social_links` | global footer links: icon/label/url (CHECK), sort_order, is_active. |
| `site_settings` | single row `id=1`; `make_your_own_url`. |
| `rate_limits` | `key PK`, window_start, hits. **RLS on, zero policies, service-role only**; keys are HMAC hashes. |

All app tables: RLS enabled, one `FOR ALL TO authenticated USING (is_admin())
WITH CHECK (is_admin())` policy; `REVOKE ALL FROM anon`. `updated_at` triggers on
all except `print_template`. GraphQL-style FK graph:

```
cards(id)
  ├──< profiles(card_id) ──< profile_links(profile_id) ──< analytics_events(profile_link_id)
  ├──< store_profiles(card_id) ──< store_links(store_profile_id) ──< analytics_events(store_link_id)
  ├──< payment_profiles(card_id) ──< payment_links(payment_profile_id) ──< analytics_events(payment_link_id)
  ├──< menu_profiles(card_id) ──< menu_categories(menu_profile_id) ──< menu_items(category_id)
  │                         └──< menu_offers(menu_profile_id)
  ├──< analytics_events(card_id)
  └──< card_edit_links(card_id)
standalone: social_links, site_settings, card_purchases, print_template, rate_limits
```

### Storage

| Bucket | Public | Limit | MIME | Notes |
|---|---|---|---|---|
| `profile-images` | yes | 5 MB | jpeg/png/webp | Path `{cardUuid}/avatar-{ts}`; old object deleted after DB update |
| `print-designs` | yes | 10 MB | jpeg/png | WebP rejected (pdf-lib can't render it) |

Public SELECT for both; admin INSERT/UPDATE/DELETE gated on
`bucket_id AND is_admin()`.

### RPC functions

- **anon + authenticated (SECURITY DEFINER):** `get_card_for_display(p_card_id) → jsonb`
  (NULL for unknown, INACTIVE shape, redirect shape, or full profile/store/
  payment/menu with active content + theme), `get_public_site_footer() → jsonb`.
  The payment shape uses a `payment` key (`full_name`, `bio`,
  `payment_image_path`) plus `links`; the menu shape uses a `menu` key plus
  public `categories` (active categories with available items) and
  `offers` (active, in-window). Menu items/offers are informational only (no
  click-tracking link IDs).
- **service_role only (SECURITY DEFINER):** `record_analytics_event(p_card_id,
  p_event_type, p_profile_link_id, p_store_link_id, p_payment_link_id,
  p_device_category, p_browser, p_os, p_referrer)` (9 args; the 5th is the new
  payment-link id; validates link→card ownership across all three link tables,
  drops invalid),
  `rate_limit_hit(p_key, p_limit, p_window_seconds)` (atomic fixed-window, ~1% opportunistic cleanup).
- **authenticated:** `generate_unique_card_id()` (explicit `is_admin()` guard;
  app still retries on 23505), `admin_get_daily_activity`,
  `admin_global_totals`, `admin_top_links`, `admin_top_cards`,
  `admin_card_click_breakdown`, `admin_list_cards`, `admin_income_monthly`,
  `admin_income_cards`, `admin_inventory_overview`, `admin_income_series`,
  `admin_income_period`, `admin_card_type_summary`. Mostly SQL `STABLE`,
  `SECURITY INVOKER` (RLS gates the rows). `admin_list_cards`, `admin_top_cards`
  and `admin_income_cards` include menu profile names for MENU cards (and
  searches/lists work for them); link-click analytics functions continue to union
  profile/store/payment link tables only (menu items/offers are informational and
  not tracked). `admin_card_type_summary` zero-fills from `enum_range`, so it
  includes MENU automatically.
- `is_admin()` (public execute) reads `auth.jwt()->'app_metadata'->>'role'`.
- `set_updated_at()` internal trigger helper.

### Migration inventory (`supabase/migrations/`, applied in filename order)

| Migration | What it does |
|---|---|
| `20260925000100_extensions_and_enums.sql` | pgcrypto, pg_trgm, initial enums |
| `20260925000200_tables.sql` | cards, profiles, profile_links, analytics_events + constraints |
| `20260925000300_indexes.sql` | status/type/created, trigram, link/analytics indexes |
| `20260925000400_updated_at_triggers.sql` | `set_updated_at()` + 3 triggers |
| `20260925000500_card_id_generator.sql` | `generate_unique_card_id()` |
| `20260925000600_public_rpc_functions.sql` | `get_card_for_display`, `record_analytics_event` |
| `20260925000700_rls_policies.sql` | first RLS pass (later hardened) |
| `20260925000800_storage.sql` | `profile-images` bucket + policies |
| `20260925000900_admin_analytics_functions.sql` | `admin_get_daily_activity` |
| `20260925001000_admin_card_list.sql` | `admin_list_cards` (later rebuilt) |
| `20260925001100_analytics_dashboard_functions.sql` | totals/top-links/top-cards/breakdown |
| `20260925001200_security_hardening.sql` | `is_admin()`, RLS rewrite, `rate_limits`, `rate_limit_hit`, URL CHECKs, service-role-only tracking, storage limits |
| `20260925001300_income_and_edit_links.sql` | price/sold, `card_edit_links`, income monthly/cards RPCs |
| `20260926000100_card_purchases.sql` | `card_purchases`, inventory/income series/period RPCs |
| `20260926000200_print_template.sql` | initial print_template (single row) + `print-designs` bucket |
| `20260927000100_print_templates_and_income_period.sql` | re-creates `admin_income_period`; one print_template row per type |
| `20261017000100_new_card_enums.sql` | +INSTAPAY/ONLINE_CASH/STORE_PROFILE, +REVIEW_CLICK |
| `20261017000200_new_card_types_schema.sql` | `google_review_url`→`target_url`, store tables, social_links, site_settings |
| `20261017000300_new_card_functions.sql` | rebuilds display/footer/tracking/list/top/income functions for new types |
| `20261018000100_admin_card_type_summary.sql` | zero-filled `admin_card_type_summary()` |
| `20261019000100_card_theme.sql` | `card_theme` enum + `cards.theme` (later replaced) |
| `20261109000100_card_theme_hex.sql` | theme enum → text hex `#rrggbb`, drops enum |
| `20261117000100_multiple_payment_methods_enum.sql` | +`MULTIPLE_PAYMENT_METHODS` (isolated enum value; no new event type) |
| `20261117000200_multiple_payment_methods_schema.sql` | `payment_profiles`/`payment_links` tables + RLS/grants/triggers; `analytics_events.payment_link_id` + 3-way link CHECK; `target_url` + print-kind CHECKs and 6th template seed; rebuilds `get_card_for_display`, `record_analytics_event` (9 args), `admin_list_cards`, `admin_top_links`, `admin_card_click_breakdown`, `admin_top_cards`, `admin_income_cards` |
| `20261119000100_menu_card_enum.sql` | +`MENU` (isolated enum value) |
| `20261119000200_menu_card_schema.sql` | `menu_profiles`/`menu_categories`/`menu_items`/`menu_offers` tables + constraints/indexes/RLS/grants/triggers; `target_url` and `print_template.kind` CHECKs extended for MENU with 7th template seed; rebuilds `get_card_for_display`, `admin_list_cards`, `admin_top_cards`, `admin_income_cards` for MENU |
| `20261119000300_menu_print_designs.sql` | Adds 8th print-template kind `menu_alt`, seeds its row, adds `menu_profiles.print_template_kind` (default `menu`) with a CHECK, so each MENU card can pick one of two print designs |
| `20261120000100_qr_rotation.sql` | Adds `print_template.qr_rotation_deg` (0..360, default 0) so each template can rotate its QR code |

`supabase/seed.sql` (local only): cards 482731 (active PROFILE), 913042 (active
GOOGLE_REVIEW), 550021 (inactive PROFILE).
`scripts/create-admin-user.mjs`: one-time/admin-rotation bootstrap; creates
`<username>@<ADMIN_EMAIL_DOMAIN>` with `app_metadata.role='admin'`, min 10-char
password, `email_confirm: true`.

---

## 6. Key flows

### Auth

`proxy.ts` refreshes the session, guards `/admin/**`, redirects admins away from
`/login`, sets the locale cookie. `getAdminContext()` (`lib/auth/require-admin.ts`)
uses `auth.getUser()` (not `getSession()`) and is re-checked in the admin layout
and every action/API route. Login maps username→email via `lib/auth/admin-email.ts`,
rate-limits per hashed IP, rejects non-admins with a generic error. Roles:
`isAdminUser()` checks `app_metadata.role`.

### Public card render

`/card/[cardId]` → `isValidCardId` → `getPublicCardView()` (React-`cache()`d RPC
call shared with `generateMetadata`) → INACTIVE `StatusScreen`, 302 redirect for
redirect types (view still counted), `PaymentProfilePublic`, `StoreProfilePublic`,
`MenuProfilePublic`, or `PublicProfileRedesigned`. Payment and menu cards are
indexable pages and their SEO metadata uses the respective page name/bio/image.
Menu offers/items shown publicly are filtered to active/in-window content; menu
items/offers are informational only (no click/tap tracking targets). The public
menu renders transparent, clickable category chips (including "All") under the headline,
formats every stored numeric price with `ح.م`, and shows only the offer end date
as `العرض مستمر حتي <date>`. View/click analytics for tracked interactions run
in `after()` / `/api/track`.

### Customer edit link

Admin creates a link (`createCardEditLink`) → token format `{base64url32}.{duration}`,
only `hashEditToken()` stored. `/edit/[token]` calls `openEditSession()` → service
role, rejects invalid/closed/expired, stamps `opened_at`/`expires_at` on first
open. `CustomerEditView` reuses the same admin/customer edit components with
token-scoped action bundles (dependency injection via
`lib/cards/profile-edit-actions.ts`), including payment and menu bundles so
customers can edit payment and menu cards too (menu base info/image plus
categories/items/offers CRUD/reorder and item/offer images). "`forever`" links
stay open on save-and-close; temporary links close early.

### Theme & accent

`cards.theme` is a free hex color. `lib/cards/accent-color.ts` parses/normalizes
hex, computes WCAG contrast, emits `--card-accent*` CSS variables applied via
`data-card-accent`; `CardThemePicker` autosaves with a 500ms debounce.

### Images

Browser: `compressImageForUpload` (WebP, >5MB only, quality 0.9→0.45, max side
1600) → `ImageCropDialog` (`react-easy-crop`, square 512px output). Server:
byte-signature validation, unique paths, DB update then delete old object, best-
effort rollback on failure. 6mb Server Action body limit.

### Print / QR

`GET .../print` uses `pdf-lib` + `qrcode` (error correction H), per-type template
geometry from DB, optional background design, logo overlay constants
(`LOGO_SIZE_RATIO=0.22`, `LOGO_BACKING_RATIO=1.35`) matching the SVG generator.
The PDF page is exactly `widthCm × heightCm` (`72/2.54 pt` per cm): all five page
boxes are pinned to those values, and the design is centre-cropped with a 2pt
overscan so no white hairline appears at the edges. If an uploaded design has a
white border baked into the image itself, re-upload an edge-to-edge version.
Each template has a `qr_rotation_deg` (0..360) value; the editor previews it and
the PDF rotates the QR, backing square, and logo together around one centre.
MENU cards use `menu_profiles.print_template_kind` (`menu` or `menu_alt`, labelled
`كارت المنيو` / `ستاند المنيو` in both locales), set from the card detail page;
`?template=` still overrides explicitly.
`GET .../qr` returns branded SVG (`buildCardQrSvg`), logo inlined as a data URI.

### Google review links

`lib/google/review-link.ts` accepts place IDs, feature IDs, Maps URLs/short
links, follows up to 5 redirects with an 8s timeout, and emits
`search.google.com/local/writereview?placeid=...`. SSRF protection: Google hosts
only (`maps.app.goo.gl`, `goo.gl`, `g.co`, `*.google.com`, country domains).

### i18n

`next-intl`; locales `en`/`ar`, **default `ar`**, cookie `NEXT_LOCALE`, no URL
prefix. `i18n/request.ts` reads cookie → `accept-language` → default and imports
`messages/{locale}.json`. 14 namespaces: `common`, `nav`, `auth`, `dashboard`,
`cards`, `links`, `publicProfile`, `analytics`, `statistics`, `tools`, `editLink`,
`errors`, `settings`, `print`. English/Arabic catalogs share the same key structure.
`LanguageSwitcher` writes the cookie and refreshes.

---

## 7. Repository file map

### Root

`AGENTS.md` (agent rules + Next.js 16 notice), `CLAUDE.md` (`@AGENTS.md`),
`CONTEXT.md` (this file), `BUSINESS_BRIEF.md`, `README.md`, `DEPLOYMENT.md`,
`.env.example`, `.env.local` (local secrets — never commit), `next.config.ts`,
`proxy.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`,
`package.json`, `package-lock.json`, `next-env.d.ts`, `Frame.svg`, `public/`
(`favicon.svg`, `icon.svg`, `brand/logo.svg`).

### `app/` (28 files)

Root: `layout.tsx`, `page.tsx`, `error.tsx`, `not-found.tsx`, `globals.css`.
`login/`: `page.tsx`, `actions.ts`.
`card/[cardId]/`: `page.tsx`, `not-found.tsx`.
`edit/[token]/`: `page.tsx`, `actions.ts`.
`admin/`: `layout.tsx`, `page.tsx`, `error.tsx`; `analytics/page.tsx`;
`statistics/page.tsx`, `actions.ts`; `settings/page.tsx`, `actions.ts`;
`print-template/page.tsx`, `actions.ts`; `cards/page.tsx`, `actions.ts`,
`new/page.tsx`, `[cardId]/page.tsx`; `tools/page.tsx`.
`api/track/route.ts`; `api/admin/cards/[cardId]/qr/route.ts`,
`api/admin/cards/[cardId]/print/route.ts`.

### `components/` (key modules)

- **`admin/`:** includes `create-card-form`, `cards-table`, `card-filters-form`,
  `pagination`, `card-status-toggle`, `card-sale-form`, `card-theme-picker`,
  `card-analytics-panel`, `card-click-breakdown-list`, `card-type-chart`,
  `activity-chart`, `income-chart`, `stat-card`, `recent-cards-list`,
  `top-cards-list`, `top-links-list`, `date-range-filter`, `qr-panel`,
  `print-card-button`, `print-template-editor`, `menu-print-template-picker`,
   `edit-link-panel`,
  `edit-profile-form`, `edit-store-form`, `edit-payment-form`,
  `edit-menu-form`, `edit-target-url-form`, `profile-fields`, `store-fields`,
  `payment-fields`, `menu-fields`, `profile-links-manager`, `menu-manager`,
  `link-form`, `link-icon-picker`, `profile-image-upload`, `image-crop-dialog`,
  `purchases-manager`, `site-settings-form`, `social-links-manager`,
  `change-password-form`, `login-form`, `google-maps-review-helper`,
  `google-review-tool`, `whatsapp-link-maker`, `whatsapp-link-tool`,
  `copy-button`, `sidebar`, `topbar`, `mobile-nav-drawer`, `nav-items.ts`.
- **`profile/`:** `public-profile-redesigned`, `store-profile-public`,
  `payment-profile-public`, `menu-profile-public`, `customer-edit-view`,
  `contact-actions`, `save-contact-button`, `share-button`, `site-footer`,
  `profile-card-preview`, `store-card-preview`, `payment-card-preview`,
  `menu-card-preview`, `use-avatar-parallax.ts`.
- **`providers/`:** `theme-provider.tsx`.
- **`shared/`:** `error-state`, `status-screen`, `language-switcher`, `theme-switcher`.
- **`ui/`:** `button` (+ `buttonVariants`), `badge`, `input`, `label` (+
  `FieldError`), `textarea`.

No component imports Supabase directly; all DB work is behind actions / `lib/data`.
Charts gate rendering on `useIsClient()` to avoid Recharts hydration mismatches
and use local light/dark palettes because Recharts writes raw SVG attributes.

### `lib/` (50 files)

- `utils.ts` — `cn()` (clsx + tailwind-merge).
- `analytics/` — `date-range` (Cairo, `today|7d|30d|all`), `parse-user-agent`,
  `referrer` (origin only), `track-client` (`trackCardEvent`).
- `auth/` — `admin-email`, `require-admin` (`getAdminContext`), `roles` (`isAdminUser`).
- `cards/` — `accent-color`, `edit-links` (token generate/hash/expiry),
  `edit-session` (token → scoped service-role client), `ids` (6-digit validator),
  `mutations` (all profile/store/payment/menu detail/link/image/menu-structure
  writes, ownership checks),
  `profile-edit-actions` (injectable action-bundle types including menu),
  `type-labels`, `urls`, `menu-price` (fixed EGP suffix/formatting for menu amounts).
- `constants/link-icons.ts` — 17-key icon registry (lucide + react-icons).
- `data/` — `analytics`, `cards`, `edit-links`, `income`, `print-template`,
  `public-card`, `social-links` (server-only read models).
- `google/review-link.ts` — Maps → review URL with SSRF protection.
- `hooks/` — `use-countdown`, `use-is-client`, `use-pointer-sort`.
- `i18n/config.ts` — locales/direction/cookie.
- `images/` — `compress-image`, `crop-image`, `limits` (5MB).
- `print/template.ts` — 8 template kinds (7 card types plus `menu_alt`), `MENU_PRINT_TEMPLATE_KINDS`, geometry helpers, defaults.
- `qr/` — `generate-qr-svg`, `logo-data-uri`.
- `security/` — `client-ip`, `rate-limit` (HMAC hash + `rate_limit_hit`).
- `storage/` — `print-designs`, `profile-images` (byte validation),
  `profile-image-url` (client-safe public URL helper for profile-images bucket).
- `supabase/` — `admin` (service role), `client` (browser), `server` (cookies).
- `validation/` — `auth`, `cards`, `print-template`, `social-links`, `track`.
- `vcard/build-vcard.ts`, `whatsapp/link.ts`.

Server-only modules use the `server-only` package. Three Supabase clients:
browser anon, server anon+cookies (RLS-bound), admin service-role (bypasses RLS).

### Other

`types/database.ts` (hand-written Supabase-style DB types), `types/index.ts`
(row aliases, domain types, `PublicCardView` variants, constants), `types/env.d.ts`.
`i18n/request.ts`. `messages/en.json`, `messages/ar.json`.
`supabase/README.md`, `supabase/seed.sql`, `supabase/migrations/*.sql`
(including `20261119000100_menu_card_enum.sql`,
`20261119000200_menu_card_schema.sql`, and
`20261119000300_menu_print_designs.sql`, `20261120000100_qr_rotation.sql`),
`supabase/.temp/*` (CLI artifacts —
sensitive, not schema). `scripts/create-admin-user.mjs`.

---

## 8. Known gaps / gotchas (verify before acting)

1. `README.md` migration table omits `20261019000100_card_theme.sql` (net schema
   unchanged — the enum was dropped later). README prose also says "migration
   1200" for security hardening (actual file `...001200_security_hardening.sql`)
   and PostgreSQL 16 vs actual 17.11.
2. `print_template.updated_at` has **no trigger** — the app sets it.
3. `analytics_events.store_link_id` has no index (profile_link_id does).
4. `admin_income_period` had to be re-created in `20260927000100` (was appended
   to an already-applied migration).
5. `globals.css` mentions IBM Plex fonts while `layout.tsx` loads Ubuntu;
   `--font-ibm-*` fallbacks remain in CSS.
6. `.env.local` and `supabase/.temp/pooler-url` / `linked-project.json` contain
   live secrets/identifiers — never commit or reproduce them.
7. "Forever" edit links are only hidden locally on close (not closed server-side).
8. `get_card_for_display` output changed twice (`google_review_url` → `target_url`,
   then `theme` added) — keep the anon contract stable.
9. Business brief describes 30-minute edit links; the UI supports
   `30m | 1h | 1d | forever` (admin default param is `forever`).
10. `MULTIPLE_PAYMENT_METHODS` needs **both** `20261117000100` (enum) and
    `20261117000200` (everything else) applied in filename order; referencing
    the value before the enum migration commits fails. Any SQL caller of
    `record_analytics_event` must now pass 9 args (the app uses named args).
11. The payment card reuses `profile-images` and `card_edit_links`, but its data
    lives only in `payment_profiles` / `payment_links`. Its print background is
    a separate `print_template` row (`multiple_payment_methods`) with its own
    upload in `/admin/print-template`.
12. `MENU` requires **both** `20261119000100_menu_card_enum.sql` (enum) and
    `20261119000200_menu_card_schema.sql` (tables/RPCs/print seed) applied in
    filename order; referencing the `MENU` enum value before the enum migration
    commits fails.
13. Menu items/offers are informational only (no click/tap tracking targets).
    Public menu visibility is filtered to active/in-window content and item
    discount display is computed client-side from the stored time windows, while
    expired/inactive offers remain manageable in admin/customer editors.
14. The public card shell (`link-in-bio-panel` / `panel-grid`) is shared by all
    four page types. Long unbroken strings in names, bios, addresses, hours,
    item/offer text and link titles are allowed to wrap anywhere so they cannot
    escape the panel; keep that constraint when adding similar content.
15. MENU's second print design needs `20261119000300_menu_print_designs.sql`
    applied **after** both 20261119 menu migrations. The `menu_alt`
    `print_template` row starts blank; upload its design in
    `/admin/print-template` before selecting it on a card.
16. `formatMenuPrice()` only appends `ح.م` to values that look like plain
    numbers; legacy price strings containing letters are left as stored to
    avoid double suffixes.

---

## 9. Maintenance log

Every change to the codebase must update the affected sections above and append
an entry here (date + what changed + sections touched).

- **2026-11-17** — Initial full-context capture from a complete read of all
  source files, migrations, configs, docs, types, and translations. All sections
  above reflect the repository at this date.
- **2026-11-17** — Added this file (`CONTEXT.md`) to the repository root and
  appended the `context-file-rules` block to `AGENTS.md` (preserving the
  auto-generated Next.js block) so every agent reads this file before work and
  updates it after every change. Sections touched: intro (checklist/log links),
  §7 (file map — `CONTEXT.md` listed at root), §9 (this log).
- **2026-11-17** — Added the `MULTIPLE_PAYMENT_METHODS` card type end-to-end:
  isolated enum + schema/functions migrations (`payment_profiles`,
  `payment_links`, `analytics_events.payment_link_id`, 6th print template with
  its own design upload), full type/validation/loader/mutation layer, admin
  create/edit/preview UI, public payment page, customer edit-link support, and
  payment-link analytics across all admin reports. Added 14 en/ar i18n keys and
  4 new components. Verified with `tsc --noEmit`, `npm run lint` and `next build`.
  Sections touched: §1, §4, §5, §6, §7, §8, §9.

- **2026-11-19** — Added the MENU card type end-to-end: isolated enum and schema migrations (menu_profiles, menu_categories, menu_items, menu_offers, MENU print-template seed, and rebuilt public/admin card-display/list/top/income RPCs), full type/validation/data/mutation layers, admin create/edit UI (menu base fields, theme/image, category/item/offer CRUD + reorder + item/offer image upload/compression), public menu page with categorized items, timed item discounts, and timed special offers (informational only, no click/tap tracking targets), and customer edit-link support for menu cards. Added required en/ar i18n keys and new menu components/helpers; fixed print-template data/editor handling to include the menu kind. Verified with `npx --no-install tsc --noEmit`, `npm run lint`, and `npm run build`. Sections touched: §1, §4, §5, §6, §7, §8, §9.

- **2026-11-19** — Fixed responsive/overflow issues in the shared public card shell and MENU UI: the panel grid now uses min-width-safe columns, long names/bios/metadata/link titles wrap inside the card, menu item/offer cards stack their images/text on narrow screens, and admin/customer menu-manager text and controls wrap instead of escaping their containers. Also applied the same long-text wrapping to the store preview. Verified with `npx --no-install tsc --noEmit`, `npm run lint`, and `npm run build`. Sections touched: §8, §9.

- **2026-11-19** — Added the four requested MENU refinements: clickable category
  chips under the public menu headline (with an "All" chip), fixed EGP currency
  formatting (`ح.م`) on displayed amounts and beside admin/customer amount
  inputs, offer end-date-only public text (`العرض مستمر حتي <date>`), and a
  second MENU print design (`menu_alt`) selectable per card from the card detail
  page. Added `20261119000300_menu_print_designs.sql`,
  `lib/cards/menu-price.ts`, `components/admin/menu-print-template-picker.tsx`,
  the `updateMenuPrintTemplate` admin action/mutation, print-endpoint template
  resolution, and en/ar keys. Verified with `npx --no-install tsc --noEmit`,
  `npm run lint`, and `npm run build`. Sections touched: §1, §4, §5, §6, §7,
  §8, §9.

- **2026-11-19** — Final MENU UI polish: public category chips now use a
  transparent background for both selected and unselected states, and the two
  MENU print templates are labelled `كارت المنيو` / `ستاند المنيو` in both
  locales. Updated `components/profile/menu-profile-public.tsx`, `messages/en.json`,
  `messages/ar.json`, and this context file. Sections touched: §1, §6, §9.

- **2026-11-20** — Added QR rotation to print templates: new
  `20261120000100_qr_rotation.sql` migration adds `qr_rotation_deg` (0..360);
  `PrintTemplate` type, DB types, validation, loader, and admin save action carry
  the value. The template editor previews the rotation and the PDF generator
  rotates the QR image, backing square, and logo together around one centre.
  Added en/ar `qrRotation` keys and updated this context file. Sections touched:
  §5, §6, §7, §9.

- **2026-11-20** — Print PDFs now use the exact centimetre dimensions entered
  in the template editor: all PDF page boxes are pinned to the cm-derived point
  size, and the design is centre-cropped (`object-cover` parity with the editor)
  with a 2pt overscan to remove edge hairlines. Updated
  `app/api/admin/cards/[cardId]/print/route.ts` and this context file.
  Sections touched: §6, §9.

- **2026-11-20** — Browser tab icon now uses the brand logo: root metadata in
  `app/layout.tsx` emits `rel="icon"` and `rel="shortcut icon"` tags pointing at
  `/favicon.svg` (the existing SVG logo asset). Updated this context file.
  Sections touched: §4, §9.
