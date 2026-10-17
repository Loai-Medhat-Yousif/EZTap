-- cards.card_id already has a unique index from the UNIQUE constraint;
-- that's the index the public /card/[cardId] lookup and the admin's
-- card-ID search both hit, so no extra index is needed for it.
create index cards_status_idx on cards (status);
create index cards_type_idx on cards (type);
create index cards_created_at_idx on cards (created_at desc);

-- Fuzzy/substring admin search on profile name ("search by profile name
-- where appropriate" — spec section 26).
create index profiles_full_name_trgm_idx
  on profiles using gin (full_name gin_trgm_ops);

-- profiles.card_id already has a unique index from the UNIQUE constraint.

create index profile_links_profile_id_sort_idx
  on profile_links (profile_id, sort_order);

-- Per-card analytics with a date filter is the hot path (dashboard +
-- per-card analytics screens both filter by card_id and a date range).
create index analytics_events_card_id_created_at_idx
  on analytics_events (card_id, created_at desc);

create index analytics_events_event_type_idx
  on analytics_events (event_type);

create index analytics_events_profile_link_id_idx
  on analytics_events (profile_link_id)
  where profile_link_id is not null;
