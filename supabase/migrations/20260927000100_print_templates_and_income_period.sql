-- Stage 14: two print templates + the missing current-period income RPC.
--
-- Two independent fixes bundled into one forward migration:
--
-- 1. `admin_income_period` was appended to the *already-applied* Stage 12
--    migration (20260926000100_card_purchases.sql), so it never actually
--    ran in any environment that had applied that file — the Statistics
--    page calls it via `getIncomeSummary()` and 500s without it. Re-create
--    it here (create or replace keeps a fresh apply idempotent).
--
-- 2. The print layout was a single global row (15cm x 20cm hard-coded).
--    It is now one row *per template kind* — `profile` and
--    `google_review` — each with its own physical size in cm and its own
--    design image, so the two card types can be printed differently. The
--    card's `type` selects which template its PDF uses.

-- 1. Missing current-period (today / this month / this year, Cairo time)
--    totals for the Statistics summary cards.
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

-- 2. Rebuild print_template as one row per template kind, preserving the
--    existing design/layout as the `profile` template.
alter table print_template rename to print_template_old;

create table print_template (
  -- Which card type this template prints: PROFILE cards -> 'profile',
  -- GOOGLE_REVIEW cards -> 'google_review'.
  kind text primary key,

  -- Physical page size in centimetres (per template, admin-defined).
  width_cm real not null default 15,
  height_cm real not null default 20,

  -- Object path within the `print-designs` Storage bucket, not a URL.
  design_path text,

  -- Card ID text: top-left anchor (fraction of page width/height).
  card_id_x real not null default 0.08,
  card_id_y real not null default 0.06,
  card_id_font_size real not null default 14,
  card_id_color text not null default '#111111',

  -- QR code: top-left anchor (fraction) + square side length (points).
  qr_x real not null default 0.66,
  qr_y real not null default 0.80,
  qr_size real not null default 80,

  updated_at timestamptz not null default now(),

  constraint print_template_kind_valid
    check (kind in ('profile', 'google_review')),
  constraint print_template_width_cm_in_bounds
    check (width_cm >= 3 and width_cm <= 60),
  constraint print_template_height_cm_in_bounds
    check (height_cm >= 3 and height_cm <= 60),
  constraint print_template_card_id_color_is_hex
    check (card_id_color ~ '^#[0-9a-fA-F]{6}$'),
  constraint print_template_card_id_position_in_bounds
    check (card_id_x >= 0 and card_id_x <= 1 and card_id_y >= 0 and card_id_y <= 1),
  constraint print_template_qr_position_in_bounds
    check (qr_x >= 0 and qr_x <= 1 and qr_y >= 0 and qr_y <= 1),
  constraint print_template_card_id_font_size_positive
    check (card_id_font_size > 0),
  constraint print_template_qr_size_positive check (qr_size > 0)
);

comment on table print_template is
  'One printable-card layout per card type (kind = profile | google_review): physical size in cm + design image path + card ID / QR positions (fractions) and sizes (points).';

-- Carry the previous single global layout over as the PROFILE template.
insert into print_template (
  kind, design_path,
  card_id_x, card_id_y, card_id_font_size, card_id_color,
  qr_x, qr_y, qr_size
)
select
  'profile', design_path,
  card_id_x, card_id_y, card_id_font_size, card_id_color,
  qr_x, qr_y, qr_size
from print_template_old
where id = 1;

-- And seed both templates with defaults (the profile row above wins when
-- the old layout existed).
insert into print_template (kind)
values ('profile')
on conflict (kind) do nothing;

insert into print_template (kind)
values ('google_review')
on conflict (kind) do nothing;

drop table print_template_old;

alter table print_template enable row level security;

revoke all on print_template from anon;
grant select, insert, update, delete on print_template to authenticated;

create policy "Admin full access to print_template"
  on print_template for all
  to authenticated
  using (is_admin()) with check (is_admin());
