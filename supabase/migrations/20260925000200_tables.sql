-- CARDS ----------------------------------------------------------------
-- Internal UUID primary key; `card_id` is the public 6-digit identifier
-- printed on the physical card. Never use card_id as a join/PK target —
-- it's a public identifier, not a secret, and must stay swappable.
create table cards (
  id uuid primary key default gen_random_uuid(),
  card_id text not null unique,
  type card_type not null,
  status card_status not null default 'INACTIVE',
  google_review_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint card_id_is_six_digits_no_leading_zero
    check (card_id ~ '^[1-9][0-9]{5}$'),

  -- Google review URL is required for GOOGLE_REVIEW cards and forbidden
  -- for PROFILE cards, so the invariant lives in the schema, not just
  -- application code.
  constraint google_review_url_matches_card_type
    check (
      (type = 'GOOGLE_REVIEW' and google_review_url is not null)
      or (type = 'PROFILE' and google_review_url is null)
    )
);

comment on table cards is 'One row per physical EZTab card.';
comment on column cards.card_id is 'Public 6-digit identifier printed on the card. Not the primary key.';

-- PROFILES ---------------------------------------------------------------
-- Exactly one profile per PROFILE-type card (enforced by the unique FK).
create table profiles (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null unique references cards (id) on delete cascade,

  profile_image_path text,   -- path within the `profile-images` Storage bucket, not a full URL
  full_name text not null,
  job_title text,
  bio text,
  phone text,
  whatsapp text,
  email text,
  website text,
  google_maps_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table profiles is 'One-to-one with cards where cards.type = PROFILE.';
comment on column profiles.card_id is 'FK to cards.id (the internal UUID), not the 6-digit public card_id.';

-- PROFILE_LINKS ------------------------------------------------------------
-- The admin's dynamic, unlimited link list (social platforms, payment
-- handles, custom links). `icon` is a free-text key resolved against the
-- app's icon registry (lib code), not a DB enum — new platforms shouldn't
-- need a migration.
create table profile_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,

  icon text not null,
  title text not null,
  url text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ANALYTICS_EVENTS ---------------------------------------------------------
-- Lightweight, append-only. No PII beyond coarse technical metadata; see
-- spec section 32 ("Do NOT collect unnecessary personal information").
create table analytics_events (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards (id) on delete cascade,
  profile_link_id uuid references profile_links (id) on delete set null,
  event_type analytics_event_type not null,

  device_category text,   -- 'mobile' | 'tablet' | 'desktop', derived server-side from UA
  browser text,
  os text,
  referrer text,

  created_at timestamptz not null default now(),

  -- profile_link_id only makes sense for LINK_CLICK events.
  constraint profile_link_id_only_for_link_click
    check (
      (event_type = 'LINK_CLICK' and profile_link_id is not null)
      or (event_type <> 'LINK_CLICK' and profile_link_id is null)
    )
);

comment on table analytics_events is 'Append-only interaction log. Inserted only via public.record_analytics_event().';
