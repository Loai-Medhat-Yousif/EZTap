-- Stage 10 security hardening.
--
-- 1. ADMIN ROLE ENFORCEMENT. The earlier RLS migration treated "any
--    authenticated Supabase session" as "the admin". That is only true
--    if public sign-up is disabled — and Supabase enables email sign-up
--    by default, so anyone holding the (public) anon key could create an
--    account and receive an `authenticated` JWT with full access.
--    Admin identity is now a claim in `app_metadata`, which — unlike
--    `user_metadata` — can only be written server-side with the service
--    role, never by the user themselves.

create or replace function is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- Replace each blanket "any authenticated user" policy.
drop policy if exists "Admin full access to cards" on cards;
create policy "Admin full access to cards"
  on cards for all to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists "Admin full access to profiles" on profiles;
create policy "Admin full access to profiles"
  on profiles for all to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists "Admin full access to profile_links" on profile_links;
create policy "Admin full access to profile_links"
  on profile_links for all to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists "Admin full access to analytics_events" on analytics_events;
create policy "Admin full access to analytics_events"
  on analytics_events for all to authenticated
  using (is_admin()) with check (is_admin());

-- Storage: reading stays public (profile photos are public), but only
-- the admin may write.
drop policy if exists "Admin upload profile images" on storage.objects;
create policy "Admin upload profile images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-images' and is_admin());

drop policy if exists "Admin update profile images" on storage.objects;
create policy "Admin update profile images"
  on storage.objects for update to authenticated
  using (bucket_id = 'profile-images' and is_admin())
  with check (bucket_id = 'profile-images' and is_admin());

drop policy if exists "Admin delete profile images" on storage.objects;
create policy "Admin delete profile images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'profile-images' and is_admin());

-- The card-ID generator gets an explicit guard rather than relying on
-- RLS making its collision check quietly return nothing for non-admins.
create or replace function generate_unique_card_id()
returns text
language plpgsql
as $$
declare
  candidate text;
  attempts int := 0;
  max_attempts constant int := 50;
begin
  if not is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  loop
    candidate := (floor(random() * 900000) + 100000)::int::text;
    exit when not exists (select 1 from cards where card_id = candidate);
    attempts := attempts + 1;
    if attempts >= max_attempts then
      raise exception
        'generate_unique_card_id: no free card_id found after % attempts',
        max_attempts;
    end if;
  end loop;

  return candidate;
end;
$$;

-- 2. STORAGE BUCKET LIMITS, enforced by Supabase Storage itself rather
--    than only by application code that a different client could skip.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'profile-images';

-- 3. URL COLUMNS. The app validates http(s) with Zod, but the database
--    is the last line of defence against a `javascript:` URL reaching a
--    rendered href or the Google Review redirect (e.g. from a manual
--    edit in the SQL editor).
alter table profile_links
  add constraint profile_links_url_is_http
  check (url ~* '^https?://' and char_length(url) <= 2048);

alter table profiles
  add constraint profiles_website_is_http
  check (website is null or (website ~* '^https?://' and char_length(website) <= 2048)),
  add constraint profiles_google_maps_url_is_http
  check (google_maps_url is null or (google_maps_url ~* '^https?://' and char_length(google_maps_url) <= 2048));

alter table cards
  add constraint cards_google_review_url_is_http
  check (google_review_url is null or (google_review_url ~* '^https?://' and char_length(google_review_url) <= 2048));

-- 4. RATE LIMITING. Serverless instances are ephemeral and numerous, so
--    an in-memory counter doesn't work; a fixed-window counter in
--    Postgres does, with no extra service. Keys are HMAC-hashed by the
--    caller (never a raw IP), rows live at most an hour, and the table
--    has RLS enabled with no policies — only the service role (which
--    bypasses RLS) can touch it.
create table rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  hits int not null default 0
);
alter table rate_limits enable row level security;
revoke all on rate_limits from anon, authenticated;

create or replace function rate_limit_hit(
  p_key text,
  p_limit int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hits int;
  v_window interval := make_interval(secs => p_window_seconds);
begin
  -- One atomic upsert: start a fresh window if the old one has
  -- expired, otherwise increment. No read-then-write race.
  insert into rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when r.window_start < now() - v_window then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - v_window then now() else r.window_start end
  returning hits into v_hits;

  -- Opportunistic cleanup so the table can't grow without bound.
  if random() < 0.01 then
    delete from rate_limits where window_start < now() - interval '1 hour';
  end if;

  return v_hits <= p_limit;
end;
$$;

revoke all on function rate_limit_hit(text, int, int) from public;
grant execute on function rate_limit_hit(text, int, int) to service_role;

-- 5. ANALYTICS WRITES NOW GO THROUGH THE APP'S RATE-LIMITED ENDPOINT.
--    Direct anonymous access to record_analytics_event let anyone with
--    the public anon key inflate any card's numbers with a curl loop.
--    Only the server (service role) may call it now; visitors reach it
--    via /api/track and the server-side view recording, both limited.
revoke execute on function record_analytics_event(
  text, analytics_event_type, uuid, text, text, text, text
) from anon, authenticated;
grant execute on function record_analytics_event(
  text, analytics_event_type, uuid, text, text, text, text
) to service_role;
