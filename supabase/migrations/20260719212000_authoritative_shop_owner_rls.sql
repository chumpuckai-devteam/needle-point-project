-- Authoritative shop ownership hardening.
-- Shops are seeded/admin-managed records; normal authenticated clients may edit
-- owner-scoped public profile fields and product rows, but may not create/delete
-- shops or assign ownership directly. owner_user_id changes stay behind the
-- moderated claim/establish/transfer/revoke RPCs from 20260719203500.

drop policy if exists "stores_owner_insert" on public.stores;
drop policy if exists "stores_owner_delete" on public.stores;

-- Re-install the only direct store write policy as owner-only UPDATE. Column
-- grants below keep owner_user_id/store identity immutable through PostgREST.
drop policy if exists "stores_owner_update" on public.stores;
create policy "stores_owner_update" on public.stores
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

-- Public profile reads remain open; all ordinary shop creation/deletion and
-- ownership assignment are service/admin concerns outside anon/auth clients.
revoke insert on public.stores from authenticated;
revoke delete on public.stores from authenticated;
revoke update on public.stores from authenticated;
grant update (name, description, website_url, location, city, avatar_url, cover_image_url, specialties, updated_at)
  on public.stores to authenticated;

comment on table public.stores
  is 'Public shop profiles. Normal authenticated clients cannot create/delete shops or update owner_user_id; ownership changes use claim/owner RPCs only.';
comment on policy "stores_owner_update" on public.stores
  is 'Allows current shop owner to update only column-granted public profile fields; owner_user_id is not granted to authenticated clients.';
