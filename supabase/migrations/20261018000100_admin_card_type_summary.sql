-- Per-type business summary for the Statistics page: for each of the
-- five card types, how many exist, how many are active, how many have
-- sold (and how many haven't), and the revenue those sales brought in.
--
-- Zero-filled across the whole enum (unnest(enum_range(...)) drives the
-- rows, `cards` is left-joined) so a type with no cards yet still shows
-- up as a row of zeroes — the table and chart never have holes, and the
-- five rows always line up with the type filter labels elsewhere.
--
-- SECURITY INVOKER like the other admin_* functions: RLS (the
-- is_admin() policy on `cards`) does the gating, so this function gets
-- no special privileges of its own.
create or replace function admin_card_type_summary()
returns table (
  card_type text,
  total bigint,
  active bigint,
  sold bigint,
  unsold bigint,
  revenue numeric
)
language sql
stable
as $$
  select
    t.type::text as card_type,
    count(c.id)::bigint as total,
    count(c.id) filter (where c.status = 'ACTIVE')::bigint as active,
    count(c.id) filter (where c.sold_at is not null)::bigint as sold,
    count(c.id) filter (where c.sold_at is null)::bigint as unsold,
    coalesce(
      sum(c.price_egp) filter (where c.sold_at is not null),
      0
    )::numeric as revenue
  from (select unnest(enum_range(null::card_type)) as type) t
  left join cards c on c.type = t.type
  group by t.type
  order by array_position(enum_range(null::card_type), t.type);
$$;

revoke all on function admin_card_type_summary() from public;
grant execute on function admin_card_type_summary() to authenticated;
