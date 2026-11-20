-- Allow each print template to rotate its QR code (and the centred logo).
--
-- The value is stored in degrees clockwise, 0..360, and applies to the
-- `print_template` row only. The editor shows a live preview and the PDF
-- generator rotates the QR, its dark backing square, and the logo together
-- around the same centre point.

alter table print_template
  add column if not exists qr_rotation_deg real not null default 0;

alter table print_template drop constraint if exists print_template_qr_rotation_deg_valid;
alter table print_template add constraint print_template_qr_rotation_deg_valid
  check (qr_rotation_deg >= 0 and qr_rotation_deg <= 360);

comment on column print_template.qr_rotation_deg is
  'Clockwise QR rotation in degrees (0..360) for this print template.';
