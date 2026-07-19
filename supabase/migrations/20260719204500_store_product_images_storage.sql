-- Store product media: public read URLs, owner-only writes scoped to one shop/product.
-- Path convention: <store_id>/<product_id>/<filename>. The product row's
-- store_products.image_url remains the source of truth for what the UI renders.
-- Upload after a product row exists, then save the returned public URL on that row.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'store-product-images',
  'store-product-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Store product images are public readable" on storage.objects;
drop policy if exists "Store product images are owner insertable" on storage.objects;
drop policy if exists "Store product images are owner updatable" on storage.objects;
drop policy if exists "Store product images are owner deletable" on storage.objects;

create policy "Store product images are public readable"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'store-product-images');

create policy "Store product images are owner insertable"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'store-product-images'
    and storage.filename(storage.objects.name) <> ''
    and (storage.foldername(storage.objects.name))[1] is not null
    and (storage.foldername(storage.objects.name))[2] is not null
    and exists (
      select 1
      from public.store_products sp
      join public.stores s on s.id = sp.store_id
      where s.id::text = (storage.foldername(storage.objects.name))[1]
        and sp.id::text = (storage.foldername(storage.objects.name))[2]
        and s.owner_user_id = (select auth.uid())
    )
  );

create policy "Store product images are owner updatable"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'store-product-images'
    and exists (
      select 1
      from public.store_products sp
      join public.stores s on s.id = sp.store_id
      where s.id::text = (storage.foldername(storage.objects.name))[1]
        and sp.id::text = (storage.foldername(storage.objects.name))[2]
        and s.owner_user_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'store-product-images'
    and storage.filename(storage.objects.name) <> ''
    and (storage.foldername(storage.objects.name))[1] is not null
    and (storage.foldername(storage.objects.name))[2] is not null
    and exists (
      select 1
      from public.store_products sp
      join public.stores s on s.id = sp.store_id
      where s.id::text = (storage.foldername(storage.objects.name))[1]
        and sp.id::text = (storage.foldername(storage.objects.name))[2]
        and s.owner_user_id = (select auth.uid())
    )
  );

create policy "Store product images are owner deletable"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'store-product-images'
    and exists (
      select 1
      from public.store_products sp
      join public.stores s on s.id = sp.store_id
      where s.id::text = (storage.foldername(storage.objects.name))[1]
        and sp.id::text = (storage.foldername(storage.objects.name))[2]
        and s.owner_user_id = (select auth.uid())
    )
  );
