-- Stage 12: card purchase (buy receipt) tracking + inventory.
--
-- The income side of the app already knows what came *in* (sold cards
-- carry price_egp + sold_at). What was missing is what went *out*: the
-- money spent buying blank (un-programmed) cards, and therefore how much
-- stock is still sitting on the shelf.
--
-- One row per purchase ("receipt"): quantity + total cost + the day it
-- was bought. This is deliberately not linked to individual `cards`
-- rows — a purchase is a batch of blanks, and blanks don't exist in
-- `cards` until they're programmed (a `cards` row IS a programmed
-- card). So inventory is derived:
--
--   bought      = sum(quantity)                       -- all blanks ever bought
--   programmed  = count(cards)                        -- blanks turned into cards
--   blank       = bought - programmed                 -- still un-programmed
--   unsold      = programmed - sold                   -- ID'd, not yet sold
--   sold        = count(cards where sold_at not null)
--   cost        = sum(total_cost)                     -- money out
--   revenue     = sum(price_egp where sold)           -- money in
--   profit      = revenue - cost                      -- the "true income"

create table card_purchases (
  id uuid primary key default gen_random_uuid(),
  quantity int not null check (quantity > 0),
  total_cost numeric(10, 2) not null check (total_cost >= 0),
  -- A plain date, not a timestamp: a receipt is "bought on this day",
  -- and a date can't drift a day across timezones the way a timestamp
  -- bucketed into Africa/Cairo could.
  purchased_on date not null default ((now() at time zone 'Africa/Cairo')::date),
  note text,
  created_at timestamptz not null default now()
);

comment on table card_purchases is
  'One row per batch of blank cards bought (quantity + total cost + date). Drives inventory + cost/profit.';

create index card_purchases_purchased_on_idx on card_purchases (purchased_on desc);

alter table card_purchases enable row level security;

revoke all on card_purchases from anon;
grant select, insert, update, delete on card_purchases to authenticated;

create policy "Admin full access to card_purchases"
  on card_purchases for all
  to authenticated
  using (is_admin()) with check (is_admin());

-- 1. Inventory snapshot. One row of derived counts + money totals, so
--    the Statistics page renders the stock/income picture in one call.
--    `blank` is clamped at 0: if the admin hasn't recorded older
--    purchases, programming can outrun the recorded "bought" count, and
--    a negative stock figure would be nonsense on the dashboard.
create or replace function admin_inventory_overview()
returns table (
  cards_bought bigint,
  cards_programmed bigint,
  cards_sold bigint,
  cards_blank bigint,
  cards_unsold bigint,
  revenue numeric,
  cost numeric,
  profit numeric
)
language sql
stable
as $$
  select
    (select coalesce(sum(quantity), 0)::bigint from card_purchases) as cards_bought,
    (select count(*)::bigint from cards) as cards_programmed,
    (select count(*)::bigint from cards where sold_at is not null) as cards_sold,
    greatest(
      (select coalesce(sum(quantity), 0)::bigint from card_purchases)
        - (select count(*)::bigint from cards),
      0
    ) as cards_blank,
    (select count(*)::bigint from cards where sold_at is null) as cards_unsold,
    (select coalesce(sum(price_egp), 0)::numeric from cards where sold_at is not null) as revenue,
    (select coalesce(sum(total_cost), 0)::numeric from card_purchases) as cost,
    (
      (select coalesce(sum(price_egp), 0)::numeric from cards where sold_at is not null)
        - (select coalesce(sum(total_cost), 0)::numeric from card_purchases)
    ) as profit;
$$;

revoke all on function admin_inventory_overview() from public;
grant execute on function admin_inventory_overview() to authenticated;

-- 2. Time series of income, cost and profit, bucketed by day, week or
--    month (Cairo time), zero-filled across the whole window so the
--    chart has no gaps. p_buckets is the window size, counted back from
--    the current bucket.
create or replace function admin_income_series(
  p_granularity text,
  p_buckets int default 12
)
returns table (
  bucket_start date,
  income numeric,
  cost numeric,
  profit numeric
)
language plpgsql
stable
as $$
declare
  v_unit interval;
begin
  if p_granularity not in ('day', 'week', 'month') then
    raise exception 'invalid granularity: %', p_granularity
      using errcode = '22023';
  end if;
  if p_buckets < 1 or p_buckets > 366 then
    raise exception 'invalid bucket count: %', p_buckets
      using errcode = '22023';
  end if;

  v_unit := ('1 ' || p_granularity)::interval;

  return query
  with grid as (
    select generate_series(
      date_trunc(p_granularity, (now() at time zone 'Africa/Cairo'))
        - ((p_buckets - 1) * v_unit),
      date_trunc(p_granularity, (now() at time zone 'Africa/Cairo')),
      v_unit
    ) as bucket_start
  ),
  sales as (
    select
      date_trunc(p_granularity, c.sold_at at time zone 'Africa/Cairo') as bucket_start,
      sum(c.price_egp) as income
    from cards c
    where c.sold_at is not null
    group by 1
  ),
  buys as (
    select
      date_trunc(p_granularity, p.purchased_on::timestamp) as bucket_start,
      sum(p.total_cost) as cost
    from card_purchases p
    group by 1
  )
  select
    g.bucket_start::date,
    coalesce(s.income, 0)::numeric as income,
    coalesce(b.cost, 0)::numeric as cost,
    (coalesce(s.income, 0) - coalesce(b.cost, 0))::numeric as profit
  from grid g
  left join sales s on s.bucket_start = g.bucket_start
  left join buys b on b.bucket_start = g.bucket_start
  order by 1;
end;
$$;

revoke all on function admin_income_series(text, int) from public;
grant execute on function admin_income_series(text, int) to authenticated;

-- 3. Current-period totals for the Statistics page's top summary cards:
--    income, cost, profit and cards sold for *today*, *this month* or
--    *this year* (Cairo time). A separate function from the series so
--    the summary doesn't depend on "the last bucket" of a chart window.
create or replace function admin_income_period(p_granularity text)
returns table (
  income numeric,
  cost numeric,
  profit numeric,
  cards_sold bigint
)
language plpgsql
stable
as $$
declare
  v_unit interval;
  v_start timestamp;
  v_end timestamp;
begin
  if p_granularity not in ('day', 'month', 'year') then
    raise exception 'invalid granularity: %', p_granularity
      using errcode = '22023';
  end if;

  v_unit := ('1 ' || p_granularity)::interval;
  v_start := date_trunc(p_granularity, (now() at time zone 'Africa/Cairo'));
  v_end := v_start + v_unit;

  return query
  with bounds as (select v_start as s, v_end as e),
  sales as (
    select
      coalesce(sum(c.price_egp), 0)::numeric as income,
      count(*)::bigint as cards_sold
    from cards c, bounds
    where c.sold_at is not null
      and (c.sold_at at time zone 'Africa/Cairo') >= bounds.s
      and (c.sold_at at time zone 'Africa/Cairo') < bounds.e
  ),
  buys as (
    select coalesce(sum(p.total_cost), 0)::numeric as cost
    from card_purchases p, bounds
    where p.purchased_on::timestamp >= bounds.s
      and p.purchased_on::timestamp < bounds.e
  )
  select
    sales.income,
    buys.cost,
    (sales.income - buys.cost)::numeric as profit,
    sales.cards_sold
  from sales, buys;
end;
$$;

revoke all on function admin_income_period(text) from public;
grant execute on function admin_income_period(text) to authenticated;
