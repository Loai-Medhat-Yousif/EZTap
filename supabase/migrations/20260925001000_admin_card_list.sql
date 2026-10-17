-- Backs the admin Cards table: search (by card_id prefix — fast via the
-- existing unique btree index — or by profile name via the pg_trgm
-- index from migration 300), type/status filters, and pagination, with
-- each row's view/click counts attached. One function instead of
-- building this join+aggregate+paginate query with the JS query
-- builder, which can't express it cleanly.
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
  google_review_url text,
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
      p.full_name as profile_full_name,
      c.google_review_url
    from cards c
    left join profiles p on p.card_id = c.id
    where
      (p_type = 'ALL' or c.type::text = p_type)
      and (p_status = 'ALL' or c.status::text = p_status)
      and (
        p_query is null or btrim(p_query) = ''
        -- card_id is always digits, so plain (case-sensitive) LIKE can
        -- use its existing btree index; ILIKE on Postgres's default
        -- collation cannot.
        or c.card_id like (btrim(p_query) || '%')
        or p.full_name ilike ('%' || btrim(p_query) || '%')
      )
  ),
  counted as (
    select *, count(*) over() as total_count from filtered
  )
  select
    f.id, f.card_id, f.type, f.status, f.created_at,
    f.profile_full_name, f.google_review_url,
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
