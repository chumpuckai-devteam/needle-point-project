-- Security: keep owner product CRUD, but do not allow arbitrary self-service shop claims.
-- 20260719195000 assigns Canopy Canvas to Samir for beta dogfood; remaining
-- unowned catalog shops still need an admin/verified claim flow before ownership.

drop policy if exists "stores_claim_unowned" on public.stores;
