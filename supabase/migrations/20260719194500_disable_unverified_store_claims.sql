-- Security: disable self-service claiming of unowned seed stores.
-- Without an out-of-band shop verification/approval flow, any signed-in user could
-- take ownership of a catalog shop and then manage its products. Keep owner writes
-- limited to already-owned stores; service role/admin migrations can assign owners.

drop policy if exists "stores_claim_unowned" on public.stores;
