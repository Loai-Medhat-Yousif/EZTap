-- Big-change pass, part 1 of 3: the new enum values.
--
-- Three new card types and one new analytics event type.
--
-- These live in their own migration file on purpose: PostgreSQL lets you
-- ADD an enum value and USE it in the same transaction only... actually
-- it does NOT — a value added by ALTER TYPE ... ADD VALUE cannot be
-- referenced (in a CHECK constraint, a function body that runs, an
-- INSERT, a cast, ...) until the transaction that added it has
-- committed. So the values are added here, and the follow-up migrations
-- (…000200 schema, …000300 functions) rebuild everything that references
-- them in later, separate transactions.

-- New card types:
--   INSTAPAY / ONLINE_CASH — "scan -> straight redirect" cards, exactly
--     like GOOGLE_REVIEW but with their own print template.
--   STORE_PROFILE — a store page (its own table, its own design).
alter type card_type add value if not exists 'INSTAPAY';
alter type card_type add value if not exists 'ONLINE_CASH';
alter type card_type add value if not exists 'STORE_PROFILE';

-- New interaction: a click on a store profile's "leave us a review"
-- button. Store link clicks reuse LINK_CLICK (with store_link_id set).
alter type analytics_event_type add value if not exists 'REVIEW_CLICK';
