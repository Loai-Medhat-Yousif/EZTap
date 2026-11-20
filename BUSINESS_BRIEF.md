# EZTab — Business Brief

A handoff document for anyone (human or AI) working on EZTab. Covers what the
business is, how it makes money, who it serves, what the product does, and the
technical facts you need to be accurate about it.

---

## 1. What EZTab is

**EZTab sells physical NFC + QR cards that link to a digital business card.**

A customer taps the card with a phone (NFC) or scans it (QR) and lands on a
mobile web page — their own card: photo/logo, name, contact actions, links,
address, and a button to leave a Google review. The physical card is the
product; the web page is what it points to.

One card = one public URL of the form `eztab.com/card/{6-digit-id}`. That
6-digit number is printed on the physical card and is the only thing the
hardware encodes. **Both QR and NFC always encode that same URL, for every
card type.** Card URLs can never change shape — they are printed on physical
hardware — which is why the whole app has no locale prefix in URLs.

## 2. How the business makes money

Two-sided economics, tracked in the database:

**Sell cards (revenue)**
- Each `cards` row is one physical card, with a `price_egp` and a `sold_at`.
- The admin records the sale price, so the dashboard reports **income** over a
  chosen period.

**Buy blank cards (cost)**
- `card_purchases` is one row per **batch of blank cards bought**: quantity,
  total cost, purchase date, and a note.
- This drives **inventory** (how many blanks are on hand) and **cost/profit**
  (revenue minus what the blanks cost).
- Dates are bucketed to `Africa/Cairo`, not UTC, because that's the business's
  actual day boundary.

There is no subscription layer and no per-feature paywall. The app itself is a
single-admin back office for a physical-product business — it is not a
multi-tenant SaaS with customer accounts.

**Market context (this matters for tone and defaults):**
- Egypt-based. Prices are in **EGP**. Payment card types point at
  **InstaPay** and **Online Cash** (the latter covers local e-wallets such as
  Vodafone Cash). Google Maps and Google reviews matter for local shops.
- **Arabic is the default language**, and the whole UI is Arabic-first
  right-to-left; English is the second language.
- Customers are non-technical: local shops, restaurants, clinics, service
  providers, freelancers, and individuals who want a tap-to-share card.

## 3. The five card types

Every card is exactly one type, and each type's data is stored separately
(a card never mixes two types' data). This separation is a deliberate, load-
bearing design rule.

| Type | What it is | Visitor experience |
|---|---|---|
| **PROFILE** | A personal digital business card: photo, name, role, bio, contact + social links, WhatsApp, Google Maps, optional "leave a review" button | Full profile page with contact actions |
| **STORE_PROFILE** | A shop/business card: logo, name, category, address, opening hours, maps location, review button, links | Full store page |
| **GOOGLE_REVIEW** | A card whose only job is to send people to a Google review form | **Straight redirect** (HTTP 302) |
| **INSTAPAY** | A card whose only job is to open an InstaPay payment link | **Straight redirect** (HTTP 302) |
| **ONLINE_CASH** | Same idea for local digital cash/wallet links | **Straight redirect** (HTTP 302) |

Notes that matter:
- The three redirect types store **only a URL** — no label, no amount, no
  description. They exist so a shop can print a dedicated payment/review card
  that does one thing.
- The URL for all three redirect types lives in one shared column
  (`cards.target_url`), which the schema constrains: **PROFILE and
  STORE_PROFILE must have it empty; the three redirect types must have it set.**
  This invariant is enforced in the database, not just in app code.
- Google Review URLs are normalised into the correct
  `search.google.com/local/writereview?placeid=...` shape; InstaPay and Online
  Cash URLs are stored exactly as entered.

## 4. Card lifecycle (the core workflow)

This is how a card comes into existence and gets used. It's the best single
description of the business in operation.

1. **Admin buys blanks** → records a `card_purchases` batch (quantity + cost).
2. **Admin creates a card** in the admin panel: picks one of the five types and
   fills in that type's details. The system generates a unique 6-digit public
   ID (no leading zero).
3. **Admin prints/prepares the card** — a print template produces a PDF with the
   QR code and the 6-digit ID, ready to send to a printer or to stick on a
   blank NFC card. Print layouts are stored in the database and editable in
   Admin → Print Template, one template per card type.
4. **Admin sells the card** → records the price and the sale date (this is the
   revenue side).
5. **Visitor taps/scans** → the QR or NFC opens `eztab.com/card/{id}`. Profile
   and store cards render a page; review/payment cards redirect immediately.
6. **The visitor acts** — clicks a link, calls, opens WhatsApp, saves the
   contact, shares, or taps "leave a review". Every one of these is recorded as
   a separate analytics event.
7. **The customer edits their own card without an account.** The admin issues a
   **time-limited edit link** (30 minutes) that opens `/edit/{token}`. The
   customer can change their photo/logo, details, and links; it expires on its
   own. This is the product's key operational trick: **no customer logins, ever.**
   No registration, no passwords, no accounts — just a temporary link the shop
   owner hands over (typically in person, at the moment of sale).
8. **Admin watches the numbers** — views, clicks, top links, top cards, device
   breakdown, income.

Everything before step 6 happens in the admin panel; step 5–6 is the public
web; step 7 is the customer's only touchpoint.

## 5. What the public card page does

**Profile and store pages** (`/card/{id}`)
- Hero: photo or logo (with a gentle parallax on scroll), name, role (profile)
  or category (store), and a short bio/description.
- **Contact actions:** call, WhatsApp, email, website, open in Google Maps,
  save contact (downloads a vCard), share (native share / copy link).
- **Links:** an ordered, icon-labelled list (website, Instagram, TikTok, X,
  WhatsApp, Telegram, Snapchat, phone, email, maps, InstaPay, custom, ...).
  Each link can be individually enabled/disabled.
- **Leave a review** button, when a Google review URL is set.
- Deactivatable: an inactive card shows "this card is currently inactive"
  instead of its content, rather than 404ing.

**Redirect pages** (review, InstaPay, online cash)
- No page at all — the visitor is redirected straight through. The visit is
  still counted (as a view); there is nothing to click.

**The shared footer (on every public page)**
- "Powered by EZTab" credit.
- EZTab's own social links, configured once in Admin → Settings (add, remove,
  reorder, icon + URL), rendered as small muted circles *below* the credit so
  they read as EZTab's external presence and not as part of the customer's card.
- A bilingual call-to-action, showing **both languages on one line** in either
  locale: `Want to make your own? · تريد أن تصنع بطاقتك؟`, pointing at a URL
  configured in Admin → Settings. This is the growth loop: every customer card
  is an advert for EZTab.

## 6. Analytics — what's measured and why

Two distinct kinds of number, deliberately kept apart:

- **Views:** one per visit to a card page, recorded server-side. For the three
  redirect types, this is the *only* number — a payment card's redirect counts
  as a view, nothing more.
- **Events:** the individual actions a visitor takes — link clicks (which link),
  phone, WhatsApp, email, website, maps, share, save-contact, and a dedicated
  **review click**. Link clicks record *which* link was clicked, and for store
  cards the store-link source is recorded too.

Coarse technical context is attached to each event: device category (mobile /
tablet / desktop), browser, OS, and referrer. **No personal data is collected** —
no IPs stored raw (rate limiting uses an HMAC hash), no names, no emails.

The dashboard turns this into: overall views/clicks, per-card click breakdown,
top links, top cards, most recently touched cards, device/browser/OS/referrer
breakdowns, and income over a selectable period.

Visitor tracking is deliberately indirect: the browser posts to an internal
`/api/track` endpoint (validated + rate-limited) instead of writing to the
database directly, and page views are recorded server-side.

## 7. The admin panel

Single-admin back office. One admin account exists; there is **no registration
UI** — the account is created by a script. Login is by **username**, not email
(Supabase Auth needs an email underneath; a helper maps username → email).

Sections:
- **Dashboard** — overview, recent and top cards.
- **Cards** — list with filters (by type, by status), create, and a detail page
  per card holding that type's editor: details, image/logo, links, review/payment
  URL, print preview, QR, and the customer-edit-link controls.
- **Print Template** — the printable layouts, one per card type.
- **Statistics** — the full analytics + income view.
- **Settings** — global EZTab social links (the footer) and site settings
  including the "want to make your own?" URL.
- **Tools** — utilities (QR generation, print/PDF export endpoints).

Admin also works on mobile: below the breakpoint, the side navigation becomes a
hamburger-opened drawer that holds the nav links, language switcher, theme
switcher, and logout.

## 8. Data model (tables)

| Table | Purpose |
|---|---|
| `cards` | One row per physical card. `card_id` = the public 6-digit ID (not the PK). Type, status, `target_url` (redirect types), `price_egp`, `sold_at`. |
| `profiles` | The details of a PROFILE card (one per card, unique FK). |
| `profile_links` | Ordered, individually toggleable links for a profile. |
| `store_profiles` | The details of a STORE_PROFILE card — deliberately separate from `profiles`. |
| `store_links` | Ordered, toggleable links for a store. |
| `analytics_events` | Append-only. Card, event type, which link, device/browser/OS/referrer. |
| `card_edit_links` | The time-limited customer edit sessions (30 minutes), reused for both profile and store cards. |
| `card_purchases` | Batches of blank cards bought: quantity, total cost, date, note. Inventory + cost. |
| `print_template` | Editable print layouts, one per card type. |
| `social_links` | EZTab's own social links, shown in the global footer. |
| `site_settings` | Global site config, including the "want to make your own?" URL. |
| `rate_limits` | Postgres-backed fixed-window counters for the public write endpoints. |

Images (profile photos and store logos) live in one Supabase Storage bucket,
keyed by card ID.

## 9. Technical facts to be accurate about

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · TypeScript ·
Tailwind CSS v4 (CSS-first `@theme`, design tokens as CSS custom properties) ·
Supabase (Postgres + Auth + Storage) · deployed on Vercel · domain `eztab.com`.

**Libraries worth knowing:** `next-intl` (i18n), `zod` + `react-hook-form`
(validation/forms), `recharts` (charts), `lucide-react` + `react-icons` (icons),
`pdf-lib` + `qrcode` (print/PDF), `react-easy-crop` (photo cropping),
`sonner` (toasts), `next-themes` (dark mode).

**Architecture rules that must not be broken:**
- **Public reads go through `SECURITY DEFINER` database functions**, not direct
  table access. Anonymous visitors have essentially no table grants; they get
  exactly one card (or the footer) through a purpose-built function. This is
  what keeps card data from being scraped in bulk.
- **All mutations are Server Actions**, each independently re-checking that the
  caller is the admin — nothing trusts a single gate.
- **The admin is identified by an `app_metadata.role = "admin"` claim**, not
  merely "has a session". A self-registered user with a forged
  `user_metadata.role` is refused everywhere.
- **URLs a visitor can be sent to are validated in Zod *and* by a database
  `CHECK` constraint**, so a `javascript:` URL can't reach a rendered link even
  via a direct SQL edit.
- **Uploaded images are verified by their actual bytes**, not by filename or
  browser-supplied content type.
- **Migrations are hand-written, numbered SQL files** applied with
  `supabase db push`. Enum additions must live in their own isolated migration
  file (Postgres can't add and use an enum value in the same transaction).
- **The five card types are first-class and data-separated.** Never merge a
  store's fields into a profile, or give a redirect card a label/amount. New
  card-type behaviour goes through the shared type-label registry so the table,
  filters, detail page, dashboard, and statistics can never disagree about what
  a type is called.

**Two languages, no URL prefix.** The active locale is a `NEXT_LOCALE` cookie
(default `ar`, RTL), not a URL segment — because card URLs are printed on
hardware and can never change.

## 10. Status and scope

Built and working: the database schema, admin auth, the admin dashboard, card
management for all five types, profiles and stores, the public card route with
redirects, print templates + PDF/QR export, analytics with income and inventory
tracking, the customer edit-link flow, global footer/social settings, and
full Arabic/English bilingual UI with light/dark themes.

Not part of the product, and shouldn't be assumed:
- No customer accounts, logins, or self-service signup (edit links only).
- No multi-tenant / multi-admin setup — a single admin, one business.
- No online storefront, checkout, or card ordering flow for end customers;
  card sales are recorded by the admin, not transacted in the app.
- No public marketing site — `/` redirects straight to the admin panel.

## 11. Glossary

- **Card** — a physical NFC/QR card, and by extension its database row.
- **Card ID** — the public 6-digit number printed on the card; the URL path.
- **Profile / Store** — the two card types that have a real page behind them.
- **Redirect card** — Google Review, InstaPay, or Online Cash: URL only, 302.
- **Edit link** — the 30-minute `/edit/{token}` window that lets a customer edit
  their own card with no account.
- **Print template** — the PDF layout for a card type; the thing that gets
  printed with the QR code on it.
- **Batch** — a `card_purchases` row: a lot of blank cards, with cost.
- **Footer / site links** — EZTab's *own* social links, global, shown on every
  public page — not the customer's links.
