-- Big-change pass, part 2 of 3: schema for the new card types, the store
-- tables, and the global footer config.
--
-- Companion to …000100 (which added the enum values — they can't be used
-- until that transaction commits) and …000300 (which rebuilds the
-- functions that reference the renamed column and the new tables).

-- =====================================================================
-- 1. cards.google_review_url -> cards.target_url
-- =====================================================================
-- GOOGLE_REVIEW, INSTAPAY and ONLINE_CASH are all "scan -> redirect"
-- cards; they share one target column rather than growing a column per
-- redirect type. PROFILE and STORE_PROFILE are pages and must have no
-- target, so the invariant stays in the schema.
alter table cards rename column google_review_url to target_url;
alter table cards
  rename constraint google_review_url_matches_card_type
  to target_url_matches_card_type;
alter table cards drop constraint target_url_matches_card_type;
alter table cards add constraint target_url_matches_card_type check (
  (type in ('GOOGLE_REVIEW', 'INSTAPAY', 'ONLINE_CASH') and target_url is not null)
  or (type in ('PROFILE', 'STORE_PROFILE') and target_url is null)
);

-- The URL-scheme CHECK from the hardening migration still references the
-- renamed column automatically; just give it a name that matches.
alter table cards
  rename constraint cards_google_review_url_is_http
  to cards_target_url_is_http;

comment on column cards.target_url is
  'Redirect target for GOOGLE_REVIEW / INSTAPAY / ONLINE_CASH cards. Null for page cards (PROFILE, STORE_PROFILE).';

-- =====================================================================
-- 2. store_profiles + store_links
-- =====================================================================
-- A store card is its own thing, separate from a personal profile: its
-- own table, its own link list, its own fields. It reuses the shared
-- `profile-images` bucket for its logo and the shared `card_edit_links`
-- table for customer edit sessions.
create table store_profiles (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null unique references cards (id) on delete cascade,

  -- Object path within the `profile-images` Storage bucket (the store
  -- logo), not a full URL.
  store_image_path text,

  full_name text not null,      -- the store's name
  category text,                -- e.g. Restaurant, Cafe, Salon
  bio text,                     -- short "about the store"
  phone text,
  whatsapp text,
  email text,
  website text,
  google_maps_url text,
  address text,
  opening_hours text,

  -- "Leave us a review" button target, normalised to Google's writereview
  -- URL when it can be (same treatment as a GOOGLE_REVIEW card).
  google_review_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint store_profiles_website_is_http
    check (website is null or (website ~* '^https?://' and char_length(website) <= 2048)),
  constraint store_profiles_google_maps_url_is_http
    check (google_maps_url is null or (google_maps_url ~* '^https?://' and char_length(google_maps_url) <= 2048)),
  constraint store_profiles_google_review_url_is_http
    check (google_review_url is null or (google_review_url ~* '^https?://' and char_length(google_review_url) <= 2048))
);

comment on table store_profiles is
  'One-to-one with cards where cards.type = STORE_PROFILE. A store page, fully separate from personal profiles.';

-- Same shape as profile_links, pointing at a store instead of a profile.
create table store_links (
  id uuid primary key default gen_random_uuid(),
  store_profile_id uuid not null references store_profiles (id) on delete cascade,

  icon text not null,
  title text not null,
  url text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint store_links_url_is_http
    check (url ~* '^https?://' and char_length(url) <= 2048)
);

comment on table store_links is
  'Dynamic link list for a store profile (mirrors profile_links for personal profiles).';

create index store_links_store_profile_idx
  on store_links (store_profile_id, sort_order);

-- =====================================================================
-- 3. analytics_events: store link clicks
-- =====================================================================
alter table analytics_events
  add column store_link_id uuid references store_links (id) on delete set null;

-- Replace the LINK_CLICK-only constraint with one that allows exactly one
-- of the two link columns for a LINK_CLICK, and neither for anything else
-- (including the new REVIEW_CLICK, which is a fixed channel button).
alter table analytics_events
  drop constraint profile_link_id_only_for_link_click;
alter table analytics_events
  add constraint analytics_events_link_target check (
    (event_type = 'LINK_CLICK'
      and ((profile_link_id is not null) <> (store_link_id is not null)))
    or (event_type <> 'LINK_CLICK'
      and profile_link_id is null and store_link_id is null)
  );

comment on column analytics_events.store_link_id is
  'Set for LINK_CLICK on a store profile link; mutually exclusive with profile_link_id.';

-- =====================================================================
-- 4. Global footer config: social_links + site_settings
-- =====================================================================
-- The circles next to "Powered by EZTab" on every public page. A single
-- global list (not per-card), fully administered from Settings.
create table social_links (
  id uuid primary key default gen_random_uuid(),

  icon text not null,          -- a key in lib/constants/link-icons.ts
  label text not null,         -- accessible name / tooltip
  url text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint social_links_url_is_http
    check (url ~* '^https?://' and char_length(url) <= 2048)
);

comment on table social_links is
  'Site-wide footer social links (the circles beside "Powered by EZTab"). Single global list.';

-- One-row settings table for anything else the footer/admin needs. Today
-- just the "Want to make your own?" link target.
create table site_settings (
  id smallint primary key default 1,

  make_your_own_url text,

  updated_at timestamptz not null default now(),

  constraint site_settings_single_row check (id = 1),
  constraint site_settings_make_your_own_url_is_http
    check (make_your_own_url is null or (make_your_own_url ~* '^https?://' and char_length(make_your_own_url) <= 2048))
);

comment on table site_settings is
  'Single-row (id = 1) global site configuration.';

insert into site_settings (id) values (1) on conflict (id) do nothing;

-- =====================================================================
-- 5. print_template: one template per new card type
-- =====================================================================
alter table print_template drop constraint print_template_kind_valid;
alter table print_template add constraint print_template_kind_valid
  check (kind in (
    'profile', 'google_review', 'instapay', 'online_cash', 'store_profile'
  ));

insert into print_template (kind) values
  ('instapay'), ('online_cash'), ('store_profile')
on conflict (kind) do nothing;

-- =====================================================================
-- 6. updated_at triggers
-- =====================================================================
create trigger store_profiles_set_updated_at
  before update on store_profiles
  for each row execute function set_updated_at();

create trigger store_links_set_updated_at
  before update on store_links
  for each row execute function set_updated_at();

create trigger social_links_set_updated_at
  before update on social_links
  for each row execute function set_updated_at();

create trigger site_settings_set_updated_at
  before update on site_settings
  for each row execute function set_updated_at();

-- =====================================================================
-- 7. RLS + grants
-- =====================================================================
alter table store_profiles enable row level security;
alter table store_links enable row level security;
alter table social_links enable row level security;
alter table site_settings enable row level security;

-- anon gets no table grant on any of these: public reads go through
-- get_card_for_display() (store data) and get_public_site_footer()
-- (social links), both SECURITY DEFINER — the same pattern as the rest of
-- the schema.
revoke all on store_profiles, store_links, social_links, site_settings from anon;
grant select, insert, update, delete
  on store_profiles, store_links, social_links, site_settings
  to authenticated;

create policy "Admin full access to store_profiles"
  on store_profiles for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "Admin full access to store_links"
  on store_links for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "Admin full access to social_links"
  on social_links for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "Admin full access to site_settings"
  on site_settings for all to authenticated
  using (is_admin()) with check (is_admin());
