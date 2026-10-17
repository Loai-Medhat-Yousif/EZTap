alter table cards enable row level security;
alter table profiles enable row level security;
alter table profile_links enable row level security;
alter table analytics_events enable row level security;

-- A Postgres role needs the underlying table privilege (GRANT) AND a
-- passing RLS policy — RLS only ever narrows, it never grants. Supabase
-- projects come with broad default grants to `authenticated` already in
-- place, but this migration doesn't rely on that undocumented platform
-- default: it grants explicitly, so the schema is correct and portable
-- on its own. `anon` intentionally gets none of these — its entire
-- interaction surface is the two SECURITY DEFINER functions from the
-- previous migration, which run with the owner's privileges regardless
-- of the caller's table grants.
grant select, insert, update, delete
  on cards, profiles, profile_links, analytics_events
  to authenticated;

-- There is exactly one admin account (spec section 22 — no multi-admin
-- roles). Any authenticated Supabase session is that admin, so a single
-- permissive policy per table is correct here and deliberately does not
-- reach for a roles/permissions table this product doesn't need.

create policy "Admin full access to cards"
  on cards for all
  to authenticated
  using (true) with check (true);

create policy "Admin full access to profiles"
  on profiles for all
  to authenticated
  using (true) with check (true);

create policy "Admin full access to profile_links"
  on profile_links for all
  to authenticated
  using (true) with check (true);

create policy "Admin full access to analytics_events"
  on analytics_events for all
  to authenticated
  using (true) with check (true);
