-- Multiple payment methods card, part 1 of 2: the new card type value.
--
-- Kept in its own migration on purpose: PostgreSQL will not let a value
-- added by ALTER TYPE ... ADD VALUE be referenced (in a CHECK constraint,
-- a function body, an INSERT, ...) until the transaction that added it has
-- committed. The follow-up migration (…000200) builds the tables,
-- constraints and functions that reference MULTIPLE_PAYMENT_METHODS.

alter type card_type add value if not exists 'MULTIPLE_PAYMENT_METHODS';

-- No new analytics event type: payment-link clicks reuse LINK_CLICK with
-- a payment_link_id, exactly like profile/store link clicks.
