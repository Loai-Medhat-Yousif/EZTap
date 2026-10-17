-- Extensions
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists pg_trgm;    -- fast fuzzy search on profiles.full_name

-- Enums
create type card_type as enum ('PROFILE', 'GOOGLE_REVIEW');
create type card_status as enum ('ACTIVE', 'INACTIVE');

-- One value per trackable interaction (spec section 31/32). LINK_CLICK
-- covers dynamic profile_links (social/custom links); the others are the
-- fixed contact-button channels that live directly on the profile row.
create type analytics_event_type as enum (
  'VIEW',
  'LINK_CLICK',
  'PHONE_CLICK',
  'WHATSAPP_CLICK',
  'EMAIL_CLICK',
  'WEBSITE_CLICK',
  'MAPS_CLICK',
  'SHARE_CLICK',
  'SAVE_CONTACT_CLICK'
);
