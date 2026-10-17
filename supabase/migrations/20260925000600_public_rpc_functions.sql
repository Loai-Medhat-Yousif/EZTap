-- Anonymous visitors never get a direct SELECT/INSERT grant on cards,
-- profiles, profile_links, or analytics_events (see the RLS migration —
-- there are simply no anon policies on those tables). Instead, the two
-- SECURITY DEFINER functions below are the entire public surface area:
-- each returns/accepts only the minimum needed for one specific job, so
-- there's no path for an anonymous request to read or write anything
-- beyond "what does this card show" and "record one interaction".

-- ---------------------------------------------------------------------
-- get_card_for_display: the single read path for the public
-- /card/[cardId] route. Shape of the returned JSON depends on status/
-- type so an inactive card never leaks profile data, and a
-- not-found card_id returns SQL NULL (the route renders its own 404 —
-- this function never distinguishes "doesn't exist" from "no
-- permission" in its response shape, which is the right call for a
-- publicly guessable 6-digit ID: don't give a prober a way to
-- distinguish those two cases).
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
  v_links jsonb;
begin
  select * into v_card from cards where card_id = p_card_id;

  if not found then
    return null;
  end if;

  if v_card.status = 'INACTIVE' then
    return jsonb_build_object('status', 'INACTIVE', 'type', v_card.type);
  end if;

  if v_card.type = 'GOOGLE_REVIEW' then
    return jsonb_build_object(
      'status', 'ACTIVE',
      'type', 'GOOGLE_REVIEW',
      'google_review_url', v_card.google_review_url
    );
  end if;

  select * into v_profile from profiles where card_id = v_card.id;

  if not found then
    -- Admin activated a PROFILE card before finishing the profile.
    -- Treat it like inactive rather than rendering a broken page.
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

-- ---------------------------------------------------------------------
-- record_analytics_event: the single write path for visitor-side
-- tracking. Validates the card exists and, for LINK_CLICK, that the
-- link actually belongs to that card's profile — an anonymous caller
-- can never insert an event against an arbitrary/unrelated card or
-- link id, since there's no direct INSERT grant on analytics_events.
create or replace function record_analytics_event(
  p_card_id text,
  p_event_type analytics_event_type,
  p_profile_link_id uuid default null,
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
    -- Silently drop events for a card_id that doesn't exist rather than
    -- raising — this is a fire-and-forget beacon call, and a stack
    -- trace here would just be noise (or a probing signal) for a
    -- visitor hitting a stale/typo'd URL.
    return;
  end if;

  if p_event_type = 'LINK_CLICK' then
    if p_profile_link_id is null then
      raise exception 'record_analytics_event: LINK_CLICK requires p_profile_link_id';
    end if;

    select exists (
      select 1
      from profile_links pl
      join profiles pr on pr.id = pl.profile_id
      where pl.id = p_profile_link_id and pr.card_id = v_card_uuid
    ) into v_link_belongs;

    if not v_link_belongs then
      -- Link id doesn't belong to this card — drop rather than insert
      -- a nonsensical row.
      return;
    end if;
  end if;

  insert into analytics_events (
    card_id, profile_link_id, event_type,
    device_category, browser, os, referrer
  ) values (
    v_card_uuid,
    case when p_event_type = 'LINK_CLICK' then p_profile_link_id else null end,
    p_event_type,
    p_device_category, p_browser, p_os, p_referrer
  );
end;
$$;

revoke all on function record_analytics_event(
  text, analytics_event_type, uuid, text, text, text, text
) from public;
grant execute on function record_analytics_event(
  text, analytics_event_type, uuid, text, text, text, text
) to anon, authenticated;
