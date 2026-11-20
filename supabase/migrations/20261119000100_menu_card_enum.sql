-- Add MENU as a new card type. Must run in its own migration because
-- PostgreSQL requires `ALTER TYPE ... ADD VALUE` to be committed before
-- the new enum value can be used in subsequent statements/migrations.
alter type card_type add value if not exists 'MENU';
