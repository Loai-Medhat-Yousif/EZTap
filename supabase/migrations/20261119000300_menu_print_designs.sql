-- Two printable MENU card designs, selectable per menu card.
--
-- All other card types keep one print template. MENU gets a second row
-- (`menu_alt`) so the admin can prepare two stand/card designs in the
-- print-template editor, then choose which one a specific menu card uses
-- on its card detail page. The choice lives on `menu_profiles` to keep
-- MENU data separated from other card types.

alter table print_template drop constraint if exists print_template_kind_valid;
alter table print_template add constraint print_template_kind_valid
  check (kind in (
    'profile', 'google_review', 'instapay', 'online_cash',
    'store_profile', 'multiple_payment_methods', 'menu', 'menu_alt'
  ));

insert into print_template (kind) values ('menu_alt')
on conflict (kind) do nothing;

alter table menu_profiles
  add column if not exists print_template_kind text not null default 'menu';

-- Defensive: the column is added with a default, but older rows or manual
-- edits must never be able to point at a template that doesn't exist.
alter table menu_profiles drop constraint if exists menu_profiles_print_template_kind_valid;
alter table menu_profiles add constraint menu_profiles_print_template_kind_valid
  check (print_template_kind in ('menu', 'menu_alt'));

comment on column menu_profiles.print_template_kind is
  'Which MENU print-template design (menu or menu_alt) this specific card uses.';
