-- Multiple payment methods card, part 2 of 2: schema, constraints, RLS
-- and the functions that reference the new type/tables.
--
-- Companion to …000100, which added the MULTIPLE_PAYMENT_METHODS enum value
-- in a separate transaction. Every reference to that value lives here so
-- Postgres can see it.

-- =====================================================================
-- 1. payment_profiles + payment_links
-- =====================================================================
-- A "multiple payment methods" card is a page card with its own data:
-- a title, a short bio, an image, and an ordered list of payment links
-- (InstaPay, Vodafone Cash, ...). It deliberately does NOT reuse
-- profiles/profile_links — every card type stays data-separated.
-- It does reuse the shared `profile-images` Storage bucket and the shared
-- `card_edit_links` table for customer edit sessions.
create table payment_profiles (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null unique references cards (id) on delete cascade,

  -- Object path within the `profile-images` bucket (photo / logo), not a
  -- full URL.
  payment_image_path text,

  full_name text not null,      -- the person's or business's name
  bio text,                     -- short description shown above the links

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table payment_profiles is
  'One-to-one with cards where cards.type = MULTIPLE_PAYMENT_METHODS. Name, bio and photo for the payment-methods page.';

create table payment_links (
  id uuid primary key default gen_random_uuid(),
  payment_profile_id uuid not null references payment_profiles (id) on delete cascade,

  icon text not null,           -- a key in lib/constants/link-icons.ts
  title text not null,          -- e.g. "InstaPay", "Vodafone Cash"
  url text not null,            -- deep link / payment handle
  sort_order integer not null default 0,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint payment_links_url_is_http
    check (url ~* '^https?://' and char_length(url) <= 2048)
);

comment on table payment_links is
  'Dynamic list of payment methods shown on a MULTIPLE_PAYMENT_METHODS card (mirrors profile_links/store_links).';

create index payment_links_payment_profile_idx
  on payment_links (payment_profile_id, sort_order);

-- =====================================================================
-- 2. analytics_events: payment link clicks
-- =====================================================================
alter table analytics_events
  add column payment_link_id uuid references payment_links (id) on delete set null;

-- Exactly one link column for a LINK_CLICK; none for every other event
-- type. num_nonnulls() keeps this readable with three candidate columns.
alter table analytics_events
  drop constraint analytics_events_link_target;
alter table analytics_events
  add constraint analytics_events_link_target check (
    (event_type = 'LINK_CLICK'
      and num_nonnulls(profile_link_id, store_link_id, payment_link_id) = 1)
    or (event_type <> 'LINK_CLICK'
      and profile_link_id is null
      and store_link_id is null
      and payment_link_id is null)
  );

comment on column analytics_events.payment_link_id is
  'Set for LINK_CLICK on a payment-methods link; mutually exclusive with profile_link_id and store_link_id.';

-- =====================================================================
-- 3. cards.target_url constraint: page cards have no redirect target
-- =====================================================================
alter table cards drop constraint target_url_matches_card_type;
alter table cards add constraint target_url_matches_card_type check (
  (type in ('GOOGLE_REVIEW', 'INSTAPAY', 'ONLINE_CASH') and target_url is not null)
  or (type in ('PROFILE', 'STORE_PROFILE', 'MULTIPLE_PAYMENT_METHODS') and target_url is null)
);

comment on column cards.target_url is
  'Redirect target for GOOGLE_REVIEW / INSTAPAY / ONLINE_CASH cards. Null for page cards (PROFILE, STORE_PROFILE, MULTIPLE_PAYMENT_METHODS).';

-- =====================================================================
-- 4. print_template: a dedicated, separately uploadable template
-- =====================================================================
alter table print_template drop constraint print_template_kind_valid;
alter table print_template add constraint print_template_kind_valid
  check (kind in (
    'profile', 'google_review', 'instapay', 'online_cash',
    'store_profile', 'multiple_payment_methods'
  ));

insert into print_template (kind) values ('multiple_payment_methods')
on conflict (kind) do nothing;

-- =====================================================================
-- 5. updated_at triggers, RLS + grants
-- =====================================================================
create trigger payment_profiles_set_updated_at
  before update on payment_profiles
  for each row execute function set_updated_at();

create trigger payment_links_set_updated_at
  before update on payment_links
  for each row execute function set_updated_at();

alter table payment_profiles enable row level security;
alter table payment_links enable row level security;

-- anon gets no table grant: public reads go through get_card_for_display()
-- (SECURITY DEFINER), the same pattern as profiles/stores.
revoke all on payment_profiles, payment_links from anon;
grant select, insert, update, delete on payment_profiles, payment_links to authenticated;

create policy "Admin full access to payment_profiles"
  on payment_profiles for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "Admin full access to payment_links"
  on payment_links for all to authenticated
  using (is_admin()) with check (is_admin());

-- =====================================================================
-- 6. get_card_for_display: serve the new page type
-- =====================================================================
create or replace function get_card_for_display(p_card_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_card cards%rowtype;
  v_profile profiles%rowtype;
  v_store store_profiles%rowtype;
  v_payment payment_profiles%rowtype;
  v_links jsonb;
begin
  select * into v_card from cards where card_id = p_card_id;

  if not found then
    return null;
  end if;

  if v_card.status = 'INACTIVE' then
    return jsonb_build_object('status', 'INACTIVE', 'type', v_card.type);
  end if;

  -- Redirect cards: the route sends visitors straight to target_url.
  if v_card.type in ('GOOGLE_REVIEW', 'INSTAPAY', 'ONLINE_CASH') then
    return jsonb_build_object(
      'status', 'ACTIVE',
      'type', v_card.type,
      'target_url', v_card.target_url
    );
  end if;

  -- Store page.
  if v_card.type = 'STORE_PROFILE' then
    select * into v_store from store_profiles where card_id = v_card.id;

    if not found then
      return jsonb_build_object('status', 'INACTIVE', 'type', 'STORE_PROFILE');
    end if;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', sl.id,
          'icon', sl.icon,
          'title', sl.title,
          'url', sl.url
        )
        order by sl.sort_order
      ) filter (where sl.is_active),
      '[]'::jsonb
    )
    into v_links
    from store_links sl
    where sl.store_profile_id = v_store.id;

    return jsonb_build_object(
      'status', 'ACTIVE',
      'type', 'STORE_PROFILE',
      'card_id', v_card.card_id,
      'theme', v_card.theme,
      'store', jsonb_build_object(
        'full_name', v_store.full_name,
        'category', v_store.category,
        'bio', v_store.bio,
        'phone', v_store.phone,
        'whatsapp', v_store.whatsapp,
        'email', v_store.email,
        'website', v_store.website,
        'google_maps_url', v_store.google_maps_url,
        'address', v_store.address,
        'opening_hours', v_store.opening_hours,
        'google_review_url', v_store.google_review_url,
        'store_image_path', v_store.store_image_path
      ),
      'links', v_links
    );
  end if;

  -- Multiple payment methods page.
  if v_card.type = 'MULTIPLE_PAYMENT_METHODS' then
    select * into v_payment from payment_profiles where card_id = v_card.id;

    if not found then
      return jsonb_build_object('status', 'INACTIVE', 'type', 'MULTIPLE_PAYMENT_METHODS');
    end if;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', pl.id,
          'icon', pl.icon,
          'title', pl.title,
          'url', pl.url
        )
        order by pl.sort_order
      ) filter (where pl.is_active),
      '[]'::jsonb
    )
    into v_links
    from payment_links pl
    where pl.payment_profile_id = v_payment.id;

    return jsonb_build_object(
      'status', 'ACTIVE',
      'type', 'MULTIPLE_PAYMENT_METHODS',
      'card_id', v_card.card_id,
      'theme', v_card.theme,
      'payment', jsonb_build_object(
        'full_name', v_payment.full_name,
        'bio', v_payment.bio,
        'payment_image_path', v_payment.payment_image_path
      ),
      'links', v_links
    );
  end if;

  -- Personal profile (unchanged shape).
  select * into v_profile from profiles where card_id = v_card.id;

  if not found then
    return jsonb_build_object('status', 'INACTIVE', 'type', 'PROFILE');
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', pl.id,
        'icon', pl.icon,
        'title', pl.title,
        'url', pl.url
      )
      order by pl.sort_order
    ) filter (where pl.is_active),
    '[]'::jsonb
  )
  into v_links
  from profile_links pl
  where pl.profile_id = v_profile.id;

  return jsonb_build_object(
    'status', 'ACTIVE',
    'type', 'PROFILE',
    'card_id', v_card.card_id,
    'theme', v_card.theme,
    'profile', jsonb_build_object(
      'full_name', v_profile.full_name,
      'job_title', v_profile.job_title,
      'bio', v_profile.bio,
      'phone', v_profile.phone,
      'whatsapp', v_profile.whatsapp,
      'email', v_profile.email,
      'website', v_profile.website,
      'google_maps_url', v_profile.google_maps_url,
      'profile_image_path', v_profile.profile_image_path
    ),
    'links', v_links
  );
end;
$$;

revoke all on function get_card_for_display(text) from public;
grant execute on function get_card_for_display(text) to anon, authenticated;

-- =====================================================================
-- 7. record_analytics_event: gains p_payment_link_id
-- =====================================================================
drop function if exists record_analytics_event(
  text, analytics_event_type, uuid, uuid, text, text, text, text
);

create or replace function record_analytics_event(
  p_card_id text,
  p_event_type analytics_event_type,
  p_profile_link_id uuid default null,
  p_store_link_id uuid default null,
  p_payment_link_id uuid default null,
  p_device_category text default null,
  p_browser text default null,
  p_os text default null,
  p_referrer text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card_uuid uuid;
  v_link_belongs boolean;
begin
  select id into v_card_uuid from cards where card_id = p_card_id;

  if v_card_uuid is null then
    return;
  end if;

  if p_event_type = 'LINK_CLICK' then
    if p_payment_link_id is not null then
      select exists (
        select 1
        from payment_links pl
        join payment_profiles pp on pp.id = pl.payment_profile_id
        where pl.id = p_payment_link_id and pp.card_id = v_card_uuid
      ) into v_link_belongs;

      if not v_link_belongs then
        return;
      end if;
    elsif p_store_link_id is not null then
      select exists (
        select 1
        from store_links sl
        join store_profiles sp on sp.id = sl.store_profile_id
        where sl.id = p_store_link_id and sp.card_id = v_card_uuid
      ) into v_link_belongs;

      if not v_link_belongs then
        return;
      end if;
    elsif p_profile_link_id is not null then
      select exists (
        select 1
        from profile_links pl
        join profiles pr on pr.id = pl.profile_id
        where pl.id = p_profile_link_id and pr.card_id = v_card_uuid
      ) into v_link_belongs;

      if not v_link_belongs then
        return;
      end if;
    else
      raise exception 'record_analytics_event: LINK_CLICK requires a link id';
    end if;
  end if;

  insert into analytics_events (
    card_id, profile_link_id, store_link_id, payment_link_id, event_type,
    device_category, browser, os, referrer
  ) values (
    v_card_uuid,
    case when p_event_type = 'LINK_CLICK' then p_profile_link_id else null end,
    case when p_event_type = 'LINK_CLICK' then p_store_link_id else null end,
    case when p_event_type = 'LINK_CLICK' then p_payment_link_id else null end,
    p_event_type,
    p_device_category, p_browser, p_os, p_referrer
  );
end;
$$;

revoke all on function record_analytics_event(
  text, analytics_event_type, uuid, uuid, uuid, text, text, text, text
) from public;
grant execute on function record_analytics_event(
  text, analytics_event_type, uuid, uuid, uuid, text, text, text, text
) to service_role;

-- =====================================================================
-- 8. admin_list_cards: search/show a payment card's name
-- =====================================================================
drop function if exists admin_list_cards(text, text, text, int, int);

create or replace function admin_list_cards(
  p_query text default null,
  p_type text default 'ALL',
  p_status text default 'ALL',
  p_page int default 1,
  p_page_size int default 20
)
returns table (
  id uuid,
  card_id text,
  type card_type,
  status card_status,
  created_at timestamptz,
  profile_full_name text,
  target_url text,
  view_count bigint,
  click_count bigint,
  total_count bigint
)
language sql
stable
as $$
  with filtered as (
    select
      c.id, c.card_id, c.type, c.status, c.created_at,
      coalesce(p.full_name, sp.full_name, pp.full_name) as profile_full_name,
      c.target_url
    from cards c
    left join profiles p on p.card_id = c.id
    left join store_profiles sp on sp.card_id = c.id
    left join payment_profiles pp on pp.card_id = c.id
    where
      (p_type = 'ALL' or c.type::text = p_type)
      and (p_status = 'ALL' or c.status::text = p_status)
      and (
        p_query is null or btrim(p_query) = ''
        or c.card_id like (btrim(p_query) || '%')
        or coalesce(p.full_name, sp.full_name, pp.full_name) ilike ('%' || btrim(p_query) || '%')
      )
  ),
  counted as (
    select *, count(*) over() as total_count from filtered
  )
  select
    f.id, f.card_id, f.type, f.status, f.created_at,
    f.profile_full_name, f.target_url,
    coalesce((
      select count(*) from analytics_events a
      where a.card_id = f.id and a.event_type = 'VIEW'
    ), 0) as view_count,
    coalesce((
      select count(*) from analytics_events a
      where a.card_id = f.id and a.event_type <> 'VIEW'
    ), 0) as click_count,
    f.total_count
  from counted f
  order by f.created_at desc
  offset greatest(p_page - 1, 0) * greatest(p_page_size, 1)
  limit greatest(p_page_size, 1);
$$;

revoke all on function admin_list_cards(text, text, text, int, int) from public;
grant execute on function admin_list_cards(text, text, text, int, int) to authenticated;

-- =====================================================================
-- 9. admin_top_links: include payment links
-- =====================================================================
create or replace function admin_top_links(
  p_start_date date default null,
  p_end_date date default null,
  p_limit int default 10
)
returns table (
  link_id uuid,
  title text,
  icon text,
  card_id text,
  click_count bigint
)
language sql
stable
as $$
  with all_links as (
    select pl.id as link_id, pl.title, pl.icon, c.card_id
    from profile_links pl
    join profiles p on p.id = pl.profile_id
    join cards c on c.id = p.card_id
    union all
    select sl.id as link_id, sl.title, sl.icon, c.card_id
    from store_links sl
    join store_profiles sp on sp.id = sl.store_profile_id
    join cards c on c.id = sp.card_id
    union all
    select pyl.id as link_id, pyl.title, pyl.icon, c.card_id
    from payment_links pyl
    join payment_profiles pp on pp.id = pyl.payment_profile_id
    join cards c on c.id = pp.card_id
  )
  select
    l.link_id,
    l.title,
    l.icon,
    l.card_id,
    count(a.id) as click_count
  from all_links l
  join analytics_events a
    on a.event_type = 'LINK_CLICK'
    and (a.profile_link_id = l.link_id or a.store_link_id = l.link_id or a.payment_link_id = l.link_id)
    and (p_start_date is null or (a.created_at at time zone 'utc')::date >= p_start_date)
    and (p_end_date is null or (a.created_at at time zone 'utc')::date <= p_end_date)
  group by l.link_id, l.title, l.icon, l.card_id
  order by click_count desc
  limit greatest(p_limit, 1);
$$;

revoke all on function admin_top_links(date, date, int) from public;
grant execute on function admin_top_links(date, date, int) to authenticated;

-- =====================================================================
-- 10. admin_card_click_breakdown: include payment links
-- =====================================================================
create or replace function admin_card_click_breakdown(
  p_card_id text,
  p_start_date date default null,
  p_end_date date default null
)
returns table (
  kind text,
  key text,
  label text,
  icon text,
  click_count bigint
)
language sql
stable
as $$
  with card as (
    select id from cards where card_id = p_card_id
  ),
  channel_counts as (
    select
      a.event_type::text as key,
      count(*) as click_count
    from analytics_events a
    join card c on c.id = a.card_id
    where a.event_type not in ('VIEW', 'LINK_CLICK')
      and (p_start_date is null or (a.created_at at time zone 'utc')::date >= p_start_date)
      and (p_end_date is null or (a.created_at at time zone 'utc')::date <= p_end_date)
    group by a.event_type
  ),
  card_links as (
    select pl.id as link_uuid, pl.id::text as key, pl.title as label, pl.icon as icon
    from profile_links pl
    join profiles p on p.id = pl.profile_id
    join card c on c.id = p.card_id
    union all
    select sl.id as link_uuid, sl.id::text as key, sl.title as label, sl.icon as icon
    from store_links sl
    join store_profiles sp on sp.id = sl.store_profile_id
    join card c on c.id = sp.card_id
    union all
    select pyl.id as link_uuid, pyl.id::text as key, pyl.title as label, pyl.icon as icon
    from payment_links pyl
    join payment_profiles pp on pp.id = pyl.payment_profile_id
    join card c on c.id = pp.card_id
  ),
  link_counts as (
    select
      l.key,
      l.label,
      l.icon,
      count(a.id) as click_count
    from card_links l
    left join analytics_events a
      on a.event_type = 'LINK_CLICK'
      and (a.profile_link_id = l.link_uuid or a.store_link_id = l.link_uuid or a.payment_link_id = l.link_uuid)
      and (p_start_date is null or (a.created_at at time zone 'utc')::date >= p_start_date)
      and (p_end_date is null or (a.created_at at time zone 'utc')::date <= p_end_date)
    group by l.key, l.label, l.icon
  )
  select 'CHANNEL' as kind, key, null::text as label, null::text as icon, click_count
  from channel_counts
  union all
  select 'LINK' as kind, key, label, icon, click_count
  from link_counts
  order by click_count desc;
$$;

revoke all on function admin_card_click_breakdown(text, date, date) from public;
grant execute on function admin_card_click_breakdown(text, date, date) to authenticated;

-- =====================================================================
-- 11. admin_top_cards / admin_income_cards: show payment card names too
-- =====================================================================
create or replace function admin_top_cards(
  p_start_date date default null,
  p_end_date date default null,
  p_limit int default 10
)
returns table (
  card_id text,
  type card_type,
  profile_full_name text,
  view_count bigint
)
language sql
stable
as $$
  select
    c.card_id,
    c.type,
    coalesce(p.full_name, sp.full_name, pp.full_name) as profile_full_name,
    count(a.id) as view_count
  from cards c
  left join profiles p on p.card_id = c.id
  left join store_profiles sp on sp.card_id = c.id
  left join payment_profiles pp on pp.card_id = c.id
  join analytics_events a
    on a.card_id = c.id
    and a.event_type = 'VIEW'
    and (p_start_date is null or (a.created_at at time zone 'utc')::date >= p_start_date)
    and (p_end_date is null or (a.created_at at time zone 'utc')::date <= p_end_date)
  group by c.card_id, c.type, p.full_name, sp.full_name, pp.full_name
  order by view_count desc
  limit greatest(p_limit, 1);
$$;

revoke all on function admin_top_cards(date, date, int) from public;
grant execute on function admin_top_cards(date, date, int) to authenticated;

create or replace function admin_income_cards(p_year int, p_month int)
returns table (
  card_id text,
  type card_type,
  profile_full_name text,
  price_egp numeric,
  sold_at timestamptz
)
language sql
stable
as $$
  select
    c.card_id,
    c.type,
    coalesce(
      (select p.full_name from profiles p where p.card_id = c.id),
      (select sp.full_name from store_profiles sp where sp.card_id = c.id),
      (select pp.full_name from payment_profiles pp where pp.card_id = c.id)
    ) as profile_full_name,
    c.price_egp,
    c.sold_at
  from cards c
  where c.sold_at is not null
    and extract(year from c.sold_at at time zone 'Africa/Cairo')::int = p_year
    and extract(month from c.sold_at at time zone 'Africa/Cairo')::int = p_month
  order by c.sold_at desc;
$$;

revoke all on function admin_income_cards(int, int) from public;
grant execute on function admin_income_cards(int, int) to authenticated;
