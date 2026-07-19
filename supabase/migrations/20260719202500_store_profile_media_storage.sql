-- Store profile media: public display URLs, owner-only writes, no orphan paths.
-- Paths are deterministic: <store_id>/avatar and <store_id>/cover. This keeps
-- profile URLs stable across replacement while bucket-level MIME/size limits
-- constrain uploads.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'store-profile-images',
  'store-profile-images',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Store profile images are owner selectable for upsert" on storage.objects;
drop policy if exists "Store profile images are owner insertable" on storage.objects;
drop policy if exists "Store profile images are owner updatable" on storage.objects;
drop policy if exists "Store profile images are owner deletable" on storage.objects;

create policy "Store profile images are owner selectable for upsert"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'store-profile-images'
    and storage.filename(name) in ('avatar', 'cover')
    and exists (
      select 1
      from public.stores s
      where s.id::text = (storage.foldername(name))[1]
        and s.owner_user_id = (select auth.uid())
    )
  );

create policy "Store profile images are owner insertable"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'store-profile-images'
    and storage.filename(name) in ('avatar', 'cover')
    and exists (
      select 1
      from public.stores s
      where s.id::text = (storage.foldername(name))[1]
        and s.owner_user_id = (select auth.uid())
    )
  );

create policy "Store profile images are owner updatable"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'store-profile-images'
    and storage.filename(name) in ('avatar', 'cover')
    and exists (
      select 1
      from public.stores s
      where s.id::text = (storage.foldername(name))[1]
        and s.owner_user_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'store-profile-images'
    and storage.filename(name) in ('avatar', 'cover')
    and exists (
      select 1
      from public.stores s
      where s.id::text = (storage.foldername(name))[1]
        and s.owner_user_id = (select auth.uid())
    )
  );

create policy "Store profile images are owner deletable"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'store-profile-images'
    and storage.filename(name) in ('avatar', 'cover')
    and exists (
      select 1
      from public.stores s
      where s.id::text = (storage.foldername(name))[1]
        and s.owner_user_id = (select auth.uid())
    )
  );
