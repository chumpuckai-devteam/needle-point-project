-- Allow signed-in users to claim unowned seed stores (set themselves as owner once).
drop policy if exists "stores_claim_unowned" on public.stores;
create policy "stores_claim_unowned" on public.stores
  for update to authenticated
  using (owner_user_id is null)
  with check (owner_user_id = (select auth.uid()));

drop policy if exists "store_products_owner_insert" on public.store_products;
create policy "store_products_owner_insert" on public.store_products
  for insert to authenticated
  with check (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "store_products_owner_update" on public.store_products;
create policy "store_products_owner_update" on public.store_products
  for update to authenticated
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "store_products_owner_delete" on public.store_products;
create policy "store_products_owner_delete" on public.store_products
  for delete to authenticated
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.owner_user_id = (select auth.uid())
    )
  );
