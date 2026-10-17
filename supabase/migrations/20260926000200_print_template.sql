-- Stage 13: printable-card PDF template.
--
-- The physical card is the same 15cm x 20cm size for every card, so the
-- print layout is *global*: one card design image plus one position for
-- the card ID and one for the QR code, applied to every card when the
-- admin prints. This is a deliberately tiny, single-row table — the
-- `id = 1` check plus a seeded row make the "exactly one template"
-- invariant structural rather than a convention.
--
-- Positions are stored as fractions of the page (0..1), so the editor
-- (which renders the page at whatever size fits the screen) and the PDF
-- generator (which renders it at 15cm x 20cm) always agree. Sizes are in
-- PostScript points (1/72"), because the page is a fixed physical size —
-- a point is a real, stable unit here, unlike the editor's pixels.

create table print_template (
  id smallint primary key default 1,

  -- Object path within the `print-designs` Storage bucket, not a URL.
  design_path text,

  -- Card ID text: top-left anchor (fraction of page width/height).
  card_id_x real not null default 0.08,
  card_id_y real not null default 0.06,
  card_id_font_size real not null default 14,
  card_id_color text not null default '#111111',

  -- QR code: top-left anchor (fraction) + square side length (points).
  qr_x real not null default 0.66,
  qr_y real not null default 0.80,
  qr_size real not null default 80,

  updated_at timestamptz not null default now(),

  constraint print_template_single_row check (id = 1),
  constraint print_template_card_id_color_is_hex
    check (card_id_color ~ '^#[0-9a-fA-F]{6}$'),
  constraint print_template_card_id_position_in_bounds
    check (card_id_x >= 0 and card_id_x <= 1 and card_id_y >= 0 and card_id_y <= 1),
  constraint print_template_qr_position_in_bounds
    check (qr_x >= 0 and qr_x <= 1 and qr_y >= 0 and qr_y <= 1),
  constraint print_template_card_id_font_size_positive
    check (card_id_font_size > 0),
  constraint print_template_qr_size_positive check (qr_size > 0)
);

comment on table print_template is
  'Single-row (id = 1) global layout for the printable card PDF: design image path + card ID / QR positions (fractions) and sizes (points).';

insert into print_template (id) values (1) on conflict (id) do nothing;

alter table print_template enable row level security;

revoke all on print_template from anon;
grant select, insert, update, delete on print_template to authenticated;

create policy "Admin full access to print_template"
  on print_template for all
  to authenticated
  using (is_admin()) with check (is_admin());

-- Storage bucket for the design image. Public read like profile images
-- (the editor previews it directly from its public URL); admin-only
-- write. 10MB ceiling for print-resolution artwork.
insert into storage.buckets (id, name, public)
values ('print-designs', 'print-designs', true)
on conflict (id) do nothing;

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png']
where id = 'print-designs';

create policy "Public read print designs"
  on storage.objects for select
  to public
  using (bucket_id = 'print-designs');

create policy "Admin upload print designs"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'print-designs' and is_admin());

create policy "Admin update print designs"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'print-designs' and is_admin())
  with check (bucket_id = 'print-designs' and is_admin());

create policy "Admin delete print designs"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'print-designs' and is_admin());
