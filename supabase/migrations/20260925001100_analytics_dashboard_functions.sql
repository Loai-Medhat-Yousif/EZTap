-- All four functions here share the same date-range convention as
-- admin_get_daily_activity: null start/end means "no lower/upper
-- bound", so the Analytics page's "All time" filter is just "pass
-- nulls" rather than a special case the SQL has to branch on.

create or replace function admin_global_totals(
  p_start_date date default null,
  p_end_date date default null
)
returns table (total_views bigint, total_clicks bigint)
language sql
stable
as $$
  select
    count(*) filter (where event_type = 'VIEW') as total_views,
    count(*) filter (where event_type <> 'VIEW') as total_clicks
  from analytics_events
  where (p_start_date is null or (created_at at time zone 'utc')::date >= p_start_date)
    and (p_end_date is null or (created_at at time zone 'utc')::date <= p_end_date);
$$;

revoke all on function admin_global_totals(date, date) from public;
grant execute on function admin_global_totals(date, date) to authenticated;

-- Most-clicked links across every card (global "Top clicked links").
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
  select
    pl.id as link_id,
    pl.title,
    pl.icon,
    c.card_id,
    count(a.id) as click_count
  from profile_links pl
  join profiles p on p.id = pl.profile_id
  join cards c on c.id = p.card_id
  join analytics_events a
    on a.profile_link_id = pl.id
    and a.event_type = 'LINK_CLICK'
    and (p_start_date is null or (a.created_at at time zone 'utc')::date >= p_start_date)
    and (p_end_date is null or (a.created_at at time zone 'utc')::date <= p_end_date)
  group by pl.id, pl.title, pl.icon, c.card_id
  order by click_count desc
  limit greatest(p_limit, 1);
$$;

revoke all on function admin_top_links(date, date, int) from public;
grant execute on function admin_top_links(date, date, int) to authenticated;

-- Most-viewed cards (global "Most viewed cards"). Only cards with at
-- least one view in range are returned — a card with zero views isn't
-- a meaningful "top" entry.
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
    p.full_name as profile_full_name,
    count(a.id) as view_count
  from cards c
  left join profiles p on p.card_id = c.id
  join analytics_events a
    on a.card_id = c.id
    and a.event_type = 'VIEW'
    and (p_start_date is null or (a.created_at at time zone 'utc')::date >= p_start_date)
    and (p_end_date is null or (a.created_at at time zone 'utc')::date <= p_end_date)
  group by c.card_id, c.type, p.full_name
  order by view_count desc
  limit greatest(p_limit, 1);
$$;

revoke all on function admin_top_cards(date, date, int) from public;
grant execute on function admin_top_cards(date, date, int) to authenticated;

-- Per-card click breakdown: the fixed contact channels (phone,
-- whatsapp, email, website, maps, share, save-contact) AND each
-- individual dynamic link, in one ranked list — matching spec section
-- 33's example ("WhatsApp: 183, Instagram: 96, TikTok: 72, ..."),
-- which mixes both kinds of row. `kind` tells the caller which: a
-- CHANNEL row's `key` is the raw event_type (translated client-side);
-- a LINK row carries its own title/icon directly.
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
  link_counts as (
    select
      pl.id::text as key,
      pl.title as label,
      pl.icon as icon,
      count(a.id) as click_count
    from profile_links pl
    join profiles p on p.id = pl.profile_id
    join card c on c.id = p.card_id
    left join analytics_events a
      on a.profile_link_id = pl.id
      and a.event_type = 'LINK_CLICK'
      and (p_start_date is null or (a.created_at at time zone 'utc')::date >= p_start_date)
      and (p_end_date is null or (a.created_at at time zone 'utc')::date <= p_end_date)
    group by pl.id, pl.title, pl.icon
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
