-- Stage 11: income tracking + temporary customer edit links.
--
-- 1. CARD SALE FIELDS. `price_egp` and `sold_at` are nullable: a card
--    that hasn't been sold (or whose price wasn't recorded) has neither.
--    Recording the sale as two plain columns on `cards` keeps monthly
--    income a single grouped sum over an indexed column, with no extra
--    table or lifecycle to maintain. `sold_at is not null` is the one
--    and only "this card was sold" flag.

alter table cards
  add column price_egp numeric(10, 2),
  add column sold_at timestamptz;

alter table cards
  add constraint cards_price_egp_nonnegative
  check (price_egp is null or price_egp >= 0);

comment on column cards.price_egp is
  'Sale price in EGP. Null = not sold / price not recorded.';
comment on column cards.sold_at is
  'When the card was sold (drive the income reports). Null = not sold.';

-- Partial index: the income pages only ever scan sold cards, and the
-- vast majority of a mature table is unsold stock.
create index cards_sold_at_idx on cards (sold_at desc)
  where sold_at is not null;

-- 2. CARD EDIT LINKS. A customer-facing, time-boxed edit session for one
--    PROFILE card. Only a SHA-256 hash of the token is stored, so the
--    database never holds a value that could be replayed from a backup;
--    the raw token exists only in the URL handed to the customer.
--
--    Lifecycle: created -> opened (timer starts, expires_at set) ->
--    closed (customer pressed "save and close") or expires_at simply
--    passes. A new link for a card revokes the previous active one, so
--    at most one window is ever open per card.

create table card_edit_links (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards (id) on delete cascade,
  token_hash text not null unique,

  created_at timestamptz not null default now(),
  opened_at timestamptz,      -- first time the customer opened the link
  expires_at timestamptz,     -- opened_at + the window; null until opened
  closed_at timestamptz,      -- customer "save and close"
  revoked_at timestamptz      -- superseded by a newer link, or admin revoked

);

comment on table card_edit_links is
  'Time-boxed customer edit sessions for a single PROFILE card.';

create index card_edit_links_card_id_idx on card_edit_links (card_id);

alter table card_edit_links enable row level security;

-- Admin-only from the app's perspective: creation/listing is an admin
-- action. The *customer* side never touches this table directly — every
-- edit request is validated server-side and executed with the service
-- role, scoped to exactly one card (see app/edit/[token]/actions.ts).
revoke all on card_edit_links from anon;
grant select, insert, update, delete on card_edit_links to authenticated;

create policy "Admin full access to card_edit_links"
  on card_edit_links for all
  to authenticated
  using (is_admin()) with check (is_admin());

-- 3. INCOME RPCS. SECURITY INVOKER (the default) is correct: only
--    `authenticated` gets EXECUTE, and that role already has SELECT +
--    an is_admin() RLS policy on cards. Africa/Cairo is the product's
--    timezone, so "this month" means the Cairo calendar month, not UTC.

-- Per-month totals for every month that has at least one sold card —
-- powers the month selector and the lifetime figure (their sum).
create or replace function admin_income_monthly()
returns table (year int, month int, income numeric, cards_sold bigint)
language sql
stable
as $$
  select
    extract(year from sold_at at time zone 'Africa/Cairo')::int as year,
    extract(month from sold_at at time zone 'Africa/Cairo')::int as month,
    coalesce(sum(price_egp), 0) as income,
    count(*) as cards_sold
  from cards
  where sold_at is not null
  group by 1, 2
  order by 1 desc, 2 desc;
$$;

revoke all on function admin_income_monthly() from public;
grant execute on function admin_income_monthly() to authenticated;

-- The individual sold cards in one Cairo calendar month, with their
-- profile name (for PROFILE cards) so the table is human-readable.
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
    (select p.full_name from profiles p where p.card_id = c.id) as profile_full_name,
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
