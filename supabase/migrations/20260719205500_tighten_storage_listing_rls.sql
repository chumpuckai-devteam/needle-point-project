-- Tighten storage object listing without breaking public image delivery.
-- The buckets remain public so stored public URLs keep rendering images, but
-- storage.objects SELECT/LIST is owner-scoped so anon/authenticated clients cannot
-- enumerate every object name in a public bucket.

-- Legacy project images use <user_id>/<uuid> paths. Public bucket delivery is the
-- intentional public-read exception; object metadata listing is owner-only.
drop policy if exists "Public read project images" on storage.objects;
drop policy if exists "Project images are owner selectable" on storage.objects;

create policy "Project images are owner selectable"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'project-images'
    and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text
  );

-- Store product images use <store_id>/<product_id>/<filename>. The public bucket
-- serves saved URLs; owners alone may SELECT/LIST object metadata under their
-- store/product prefixes for management flows.
drop policy if exists "Store product images are public readable" on storage.objects;
drop policy if exists "Store product images are owner selectable" on storage.objects;

create policy "Store product images are owner selectable"
  on storage.objects
  for select
  to authenticated
  using (
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
