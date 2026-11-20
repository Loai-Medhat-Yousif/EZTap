-- Per-card accent colour: free colour picker instead of preset palettes.
--
-- 20261019000100 introduced `cards.theme` as an enum of six presets.
-- This migration keeps the same column (and the same get_card_for_display
-- contract) but stores an arbitrary hex colour instead. Existing preset
-- values are mapped to the exact hex they rendered as, so every card that
-- was already using a preset keeps the same look.
--
-- The default stays the EZTab brand blue (#005CF2), which is also what all
-- cards created before themes existed carry.

alter table cards alter column theme drop default;

alter table cards
  alter column theme type text
  using (
    case theme::text
      when 'blue' then '#005cf2'
      when 'emerald' then '#047857'
      when 'violet' then '#7c3aed'
      when 'rose' then '#e11d48'
      when 'amber' then '#b45309'
      when 'slate' then '#334155'
      else '#005cf2'
    end
  );

alter table cards alter column theme set default '#005cf2';

alter table cards
  add constraint cards_theme_is_hex
  check (theme ~ '^#[0-9a-fA-F]{6}$');

comment on column cards.theme is
  'Accent colour (hex, e.g. #005CF2) for the public page of a PROFILE / STORE_PROFILE card. Defaults to the brand blue.';

drop type card_theme;

-- get_card_for_display() reads `v_card.theme` via cards%rowtype, so it
-- automatically returns the new text value; no function replacement is
-- needed.
