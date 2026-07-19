-- Private beta: allow claim of unowned shops so owner product CRUD is usable.
-- Full shop verification can replace this later.
drop policy if exists "stores_claim_unowned" on public.stores;
create policy "stores_claim_unowned" on public.stores
  for update to authenticated
  using (owner_user_id is null)
  with check (owner_user_id = (select auth.uid()));

-- Give Samir's profile ownership of Canopy Canvas for immediate dogfood.
update public.stores s
set owner_user_id = p.id,
    updated_at = now()
from public.profiles p
where s.handle = 'canopycanvas'
  and p.handle = 'samirsview'
  and (s.owner_user_id is null or s.owner_user_id = p.id);
