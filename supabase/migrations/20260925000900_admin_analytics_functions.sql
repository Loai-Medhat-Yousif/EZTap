-- Powers both the dashboard's activity chart (Stage 4) and the
-- Analytics page's charts (Stage 9) with one query instead of many
-- separate counts. Takes an explicit date range rather than a day
-- count so it can express "today", "7 days", "30 days", and "all
-- time" uniformly (all time = start bound resolved from the earliest
-- event) — and an optional card_id so the exact same function serves
-- both the global chart and a single card's chart.
--
-- SECURITY INVOKER (the default) is correct and sufficient here,
-- unlike the two anon-facing functions in an earlier migration: only
-- `authenticated` gets EXECUTE, and that role already has its own
-- SELECT grant + RLS policy on analytics_events, so there's nothing to
-- elevate.
create or replace function admin_get_daily_activity(
  p_start_date date default null,
  p_end_date date default null,
  p_card_id text default null
)
returns table (day date, views bigint, clicks bigint)
language sql
stable
as $$
  with bounds as (
    select
      coalesce(
        p_start_date,
        (select min(created_at) at time zone 'utc' from analytics_events)::date,
        (now() at time zone 'utc')::date
      ) as start_date,
      coalesce(p_end_date, (now() at time zone 'utc')::date) as end_date
  ),
  card as (
    select id from cards where p_card_id is not null and card_id = p_card_id
  )
  select
    d::date as day,
    count(*) filter (where a.event_type = 'VIEW') as views,
    count(*) filter (where a.event_type is not null and a.event_type <> 'VIEW') as clicks
  from bounds b
  cross join lateral generate_series(b.start_date, b.end_date, interval '1 day') as d
  left join analytics_events a
    on (a.created_at at time zone 'utc')::date = d::date
    and (p_card_id is null or a.card_id = (select id from card))
  group by d
  order by d;
$$;

-- The old (int) overload from the previous version of this migration
-- is superseded by the (date, date, text) signature above — drop it
-- explicitly, since `create or replace` only replaces a function with
-- an identical parameter list; a changed signature would otherwise
-- just add a second overload and leave the stale one behind.
drop function if exists admin_get_daily_activity(int);

revoke all on function admin_get_daily_activity(date, date, text) from public;
grant execute on function admin_get_daily_activity(date, date, text) to authenticated;
