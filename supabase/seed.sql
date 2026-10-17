-- Dev-only fixture data. Loaded by `supabase db reset` against your
-- LOCAL Supabase instance only — the CLI never runs seed.sql against a
-- linked remote project, so this never touches production.
--
-- Mirrors the three card states so the public /card/[cardId] route,
-- once built, has something real to hit right away:
--   /card/482731  -> active profile card
--   /card/913042  -> active Google Review card (redirects immediately)
--   /card/550021  -> inactive card

insert into cards (card_id, type, status)
values ('482731', 'PROFILE', 'ACTIVE')
on conflict (card_id) do nothing;

insert into profiles (card_id, full_name, job_title, bio, phone, whatsapp, email, website, google_maps_url)
select id, 'Ahmed Mohamed', 'Software Engineer', 'Building EZTab, one tap at a time.',
       '+201000000000', '+201000000000', 'ahmed@example.com', 'https://ahmed.dev',
       'https://maps.app.goo.gl/example'
from cards
where card_id = '482731'
on conflict (card_id) do nothing;

insert into profile_links (profile_id, icon, title, url, sort_order, is_active)
select p.id, v.icon, v.title, v.url, v.sort_order, true
from profiles p
cross join (values
  ('instagram', 'Instagram', 'https://instagram.com/ahmed', 0),
  ('tiktok', 'TikTok', 'https://tiktok.com/@ahmed', 1),
  ('vodafone_cash', 'Vodafone Cash', 'https://example.com/vcash/ahmed', 2)
) as v(icon, title, url, sort_order)
where p.card_id = (select id from cards where card_id = '482731');

insert into cards (card_id, type, status, google_review_url)
values ('913042', 'GOOGLE_REVIEW', 'ACTIVE', 'https://g.page/r/example-business/review')
on conflict (card_id) do nothing;

insert into cards (card_id, type, status)
values ('550021', 'PROFILE', 'INACTIVE')
on conflict (card_id) do nothing;
