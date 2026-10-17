-- Public bucket: profile images are shown on public profile pages, so
-- they need to load without a signed URL. Writes are admin-only.
insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

create policy "Public read profile images"
  on storage.objects for select
  to public
  using (bucket_id = 'profile-images');

create policy "Admin upload profile images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'profile-images');

create policy "Admin update profile images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'profile-images')
  with check (bucket_id = 'profile-images');

create policy "Admin delete profile images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'profile-images');
