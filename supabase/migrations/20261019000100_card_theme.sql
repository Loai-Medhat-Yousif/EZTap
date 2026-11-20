-- Per-card colour theme for the public page.
--
-- Every card that renders an EZTab page (PROFILE / STORE_PROFILE) now
-- carries an accent theme. The column is NOT NULL with a default of
-- 'blue', which is exactly the current brand palette — so every existing
-- card keeps the look it has today, and new cards start there too until
-- the admin (or the customer, via their edit link) picks another one.
--
-- The theme is stored on `cards` (not on profiles / store_profiles)
-- because it is a property of the card's public page, and because the
-- customer edit session is already scoped to a card row.
--
-- Redirect cards (GOOGLE_REVIEW / INSTAPAY / ONLINE_CASH) never render a
-- page, but the column still exists on their rows with the default; the
-- application simply never offers a picker for them.

create type card_theme as enum (
  'blue',
  'emerald',
  'violet',
  'rose',
  'amber',
  'slate'
);

alter table cards
  add column theme card_theme not null default 'blue';

comment on column cards.theme is
  'Accent colour theme for the public page (PROFILE / STORE_PROFILE). Defaults to the brand blue.';

-- get_card_for_display: expose the theme alongside the page data so the
-- public route can apply it without a second query. The rest of the
-- contract is unchanged.
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
  v_links jsonb;
begin
  select * into v_card from cards where card_id = p_card_id;

  if not found then
    return null;
  end if;

  if v_card.status = 'INACTIVE' then
    return jsonb_build_object('status', 'INACTIVE', 'type', v_card.type);
  end if;

  -- Every redirect card. Same shape for all three: the visitor is sent
  -- straight to target_url (the route redirects; there is no EZTab page).
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
      -- Admin activated the card before finishing the store. Treat like
      -- inactive rather than rendering a broken page.
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

  -- Personal profile.
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
