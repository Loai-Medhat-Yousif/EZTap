-- MENU card type, part 2 of 2: schema, constraints, RLS and functions.
--
-- Companion to …000100, which added the MENU enum value in a separate
-- transaction. Every reference to that value lives here.

-- =====================================================================
-- 1. menu_profiles + menu_categories + menu_items + menu_offers
-- =====================================================================
-- A MENU card is a full store-like page with its own menu structure:
-- base info (like STORE_PROFILE), categorized menu items (with optional
-- per-item images and timed discount flags), and separate timed offers.
-- Menu items/offers are informational (no click tracking). Images reuse
-- the shared `profile-images` bucket and the shared `card_edit_links`
-- table is used for customer edit sessions.

create table menu_profiles (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null unique references cards (id) on delete cascade,

  -- Object path within the `profile-images` bucket (logo/photo), not a
  -- full URL.
  menu_image_path text,

  full_name text not null,
  category text,
  bio text,
  phone text,
  whatsapp text,
  email text,
  website text,
  google_maps_url text,
  address text,
  opening_hours text,
  google_review_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table menu_profiles is
  'One-to-one with cards where cards.type = MENU. Store-like info for a menu page.';

create table menu_categories (
  id uuid primary key default gen_random_uuid(),
  menu_profile_id uuid not null references menu_profiles (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table menu_categories is
  'Menu sections/categories for a MENU card.';

create index menu_categories_profile_idx
  on menu_categories (menu_profile_id, sort_order);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references menu_categories (id) on delete cascade,

  name text not null,
  description text,
  price text,
  -- Object path within the `profile-images` bucket.
  image_path text,
  is_available boolean not null default true,
  sort_order integer not null default 0,

  -- Optional timed discount flag shown on the item.
  discount_label text,
  discount_price text,
  discount_starts_at timestamptz,
  discount_ends_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table menu_items is
  'Items within a menu category, with optional image and timed discount flag.';

create index menu_items_category_idx
  on menu_items (category_id, sort_order);

create table menu_offers (
  id uuid primary key default gen_random_uuid(),
  menu_profile_id uuid not null references menu_profiles (id) on delete cascade,

  title text not null,
  description text,
  -- Object path within the `profile-images` bucket.
  image_path text,
  price_text text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table menu_offers is
  'Separate timed special offers for a MENU card.';

create index menu_offers_profile_idx
  on menu_offers (menu_profile_id, sort_order);

-- =====================================================================
-- 2. cards.target_url constraint: MENU is a page card (no redirect)
-- =====================================================================
alter table cards drop constraint target_url_matches_card_type;
alter table cards add constraint target_url_matches_card_type check (
  (type in ('GOOGLE_REVIEW', 'INSTAPAY', 'ONLINE_CASH') and target_url is not null)
  or (type in ('PROFILE', 'STORE_PROFILE', 'MULTIPLE_PAYMENT_METHODS', 'MENU') and target_url is null)
);

comment on column cards.target_url is
  'Redirect target for GOOGLE_REVIEW / INSTAPAY / ONLINE_CASH cards. Null for page cards (PROFILE, STORE_PROFILE, MULTIPLE_PAYMENT_METHODS, MENU).';

-- =====================================================================
-- 3. print_template: dedicated template kind for MENU
-- =====================================================================
alter table print_template drop constraint print_template_kind_valid;
alter table print_template add constraint print_template_kind_valid
  check (kind in (
    'profile', 'google_review', 'instapay', 'online_cash',
    'store_profile', 'multiple_payment_methods', 'menu'
  ));

insert into print_template (kind) values ('menu')
on conflict (kind) do nothing;

-- =====================================================================
-- 4. updated_at triggers, RLS + grants
-- =====================================================================
create trigger menu_profiles_set_updated_at
  before update on menu_profiles
  for each row execute function set_updated_at();

create trigger menu_categories_set_updated_at
  before update on menu_categories
  for each row execute function set_updated_at();

create trigger menu_items_set_updated_at
  before update on menu_items
  for each row execute function set_updated_at();

create trigger menu_offers_set_updated_at
  before update on menu_offers
  for each row execute function set_updated_at();

alter table menu_profiles enable row level security;
alter table menu_categories enable row level security;
alter table menu_items enable row level security;
alter table menu_offers enable row level security;

-- anon gets no table grant: public reads go through get_card_for_display()
-- (SECURITY DEFINER), the same pattern as other page-card tables.
revoke all on menu_profiles, menu_categories, menu_items, menu_offers from anon;
grant select, insert, update, delete on menu_profiles, menu_categories, menu_items, menu_offers to authenticated;

create policy "Admin full access to menu_profiles"
  on menu_profiles for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "Admin full access to menu_categories"
  on menu_categories for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "Admin full access to menu_items"
  on menu_items for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "Admin full access to menu_offers"
  on menu_offers for all to authenticated
  using (is_admin()) with check (is_admin());

-- =====================================================================
-- 5. get_card_for_display: serve the MENU page type
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
  v_menu menu_profiles%rowtype;
  v_links jsonb;
  v_categories jsonb;
  v_offers jsonb;
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

  -- Menu page.
  if v_card.type = 'MENU' then
    select * into v_menu from menu_profiles where card_id = v_card.id;

    if not found then
      return jsonb_build_object('status', 'INACTIVE', 'type', 'MENU');
    end if;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', mc.id,
          'name', mc.name,
          'items', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', mi.id,
                'name', mi.name,
                'description', mi.description,
                'price', mi.price,
                'image_path', mi.image_path,
                'discount_label', mi.discount_label,
                'discount_price', mi.discount_price,
                'discount_starts_at', mi.discount_starts_at,
                'discount_ends_at', mi.discount_ends_at
              )
              order by mi.sort_order
            )
            from menu_items mi
            where mi.category_id = mc.id
              and mi.is_available
          ), '[]'::jsonb)
        )
        order by mc.sort_order
      ),
      '[]'::jsonb
    )
    into v_categories
    from menu_categories mc
    where mc.menu_profile_id = v_menu.id
      and mc.is_active;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', mo.id,
          'title', mo.title,
          'description', mo.description,
          'image_path', mo.image_path,
          'price_text', mo.price_text,
          'starts_at', mo.starts_at,
          'ends_at', mo.ends_at
        )
        order by mo.sort_order
      ),
      '[]'::jsonb
    )
    into v_offers
    from menu_offers mo
    where mo.menu_profile_id = v_menu.id
      and mo.is_active
      and (mo.starts_at is null or mo.starts_at <= now())
      and (mo.ends_at is null or mo.ends_at > now());

    return jsonb_build_object(
      'status', 'ACTIVE',
      'type', 'MENU',
      'card_id', v_card.card_id,
      'theme', v_card.theme,
      'menu', jsonb_build_object(
        'full_name', v_menu.full_name,
        'category', v_menu.category,
        'bio', v_menu.bio,
        'phone', v_menu.phone,
        'whatsapp', v_menu.whatsapp,
        'email', v_menu.email,
        'website', v_menu.website,
        'google_maps_url', v_menu.google_maps_url,
        'address', v_menu.address,
        'opening_hours', v_menu.opening_hours,
        'google_review_url', v_menu.google_review_url,
        'menu_image_path', v_menu.menu_image_path
      ),
      'categories', v_categories,
      'offers', v_offers
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
-- 6. admin_list_cards: search/show a MENU card's name
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
      coalesce(p.full_name, sp.full_name, pp.full_name, mp.full_name) as profile_full_name,
      c.target_url
    from cards c
    left join profiles p on p.card_id = c.id
    left join store_profiles sp on sp.card_id = c.id
    left join payment_profiles pp on pp.card_id = c.id
    left join menu_profiles mp on mp.card_id = c.id
    where
      (p_type = 'ALL' or c.type::text = p_type)
      and (p_status = 'ALL' or c.status::text = p_status)
      and (
        p_query is null or btrim(p_query) = ''
        or c.card_id like (btrim(p_query) || '%')
        or coalesce(p.full_name, sp.full_name, pp.full_name, mp.full_name) ilike ('%' || btrim(p_query) || '%')
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
-- 7. admin_top_cards / admin_income_cards: show MENU card names too
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
    coalesce(p.full_name, sp.full_name, pp.full_name, mp.full_name) as profile_full_name,
    count(a.id) as view_count
  from cards c
  left join profiles p on p.card_id = c.id
  left join store_profiles sp on sp.card_id = c.id
  left join payment_profiles pp on pp.card_id = c.id
  left join menu_profiles mp on mp.card_id = c.id
  join analytics_events a
    on a.card_id = c.id
    and a.event_type = 'VIEW'
    and (p_start_date is null or (a.created_at at time zone 'utc')::date >= p_start_date)
    and (p_end_date is null or (a.created_at at time zone 'utc')::date <= p_end_date)
  group by c.card_id, c.type, p.full_name, sp.full_name, pp.full_name, mp.full_name
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
      (select pp.full_name from payment_profiles pp where pp.card_id = c.id),
      (select mp.full_name from menu_profiles mp where mp.card_id = c.id)
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
