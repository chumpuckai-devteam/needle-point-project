-- Harden shop ownership: verified request -> approval claim flow.
-- Direct "claim unowned" table updates are intentionally removed. Authenticated
-- users may create a pending request; only a current owner or service-role/admin
-- path may approve/deny/transfer/revoke ownership.

create table if not exists public.store_claim_requests (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  requester_user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied', 'cancelled')),
  message text not null default '',
  decision_note text not null default '',
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_claim_requests_message_length check (char_length(message) <= 1000),
  constraint store_claim_requests_decision_note_length check (char_length(decision_note) <= 1000)
);

create index if not exists store_claim_requests_store_idx on public.store_claim_requests (store_id);
create index if not exists store_claim_requests_requester_idx on public.store_claim_requests (requester_user_id);
create index if not exists store_claim_requests_status_idx on public.store_claim_requests (status);
create unique index if not exists store_claim_requests_one_pending_store_idx
  on public.store_claim_requests (store_id)
  where status = 'pending';
create unique index if not exists store_claim_requests_one_pending_requester_store_idx
  on public.store_claim_requests (store_id, requester_user_id)
  where status = 'pending';

drop trigger if exists store_claim_requests_set_updated_at on public.store_claim_requests;
create trigger store_claim_requests_set_updated_at before update on public.store_claim_requests
for each row execute function public.set_updated_at();

alter table public.store_claim_requests enable row level security;

-- Remove every historical open-claim path and broad product/store writes before
-- installing the hardened policies below.
drop policy if exists "stores_claim_unowned" on public.stores;
drop policy if exists "stores_owner_write" on public.stores;
drop policy if exists "stores_owner_insert" on public.stores;
drop policy if exists "stores_owner_update" on public.stores;
drop policy if exists "stores_owner_delete" on public.stores;
drop policy if exists "store_products_auth_write" on public.store_products;
drop policy if exists "store_products_owner_insert" on public.store_products;
drop policy if exists "store_products_owner_update" on public.store_products;
drop policy if exists "store_products_owner_delete" on public.store_products;

create policy "stores_owner_insert" on public.stores
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));

create policy "stores_owner_update" on public.stores
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

create policy "stores_owner_delete" on public.stores
  for delete to authenticated
  using (owner_user_id = (select auth.uid()));

create policy "store_products_owner_insert" on public.store_products
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_user_id = (select auth.uid())
    )
  );

create policy "store_products_owner_update" on public.store_products
  for update to authenticated
  using (
    exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_user_id = (select auth.uid())
    )
  );

create policy "store_products_owner_delete" on public.store_products
  for delete to authenticated
  using (
    exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "store_claim_requests_select_involved" on public.store_claim_requests;
drop policy if exists "store_claim_requests_insert_own_pending" on public.store_claim_requests;
drop policy if exists "store_claim_requests_cancel_own_pending" on public.store_claim_requests;

create policy "store_claim_requests_select_involved" on public.store_claim_requests
  for select to authenticated
  using (
    requester_user_id = (select auth.uid())
    or exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_user_id = (select auth.uid())
    )
  );

create policy "store_claim_requests_insert_own_pending" on public.store_claim_requests
  for insert to authenticated
  with check (
    requester_user_id = (select auth.uid())
    and status = 'pending'
    and decided_by is null
    and decided_at is null
    and exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_user_id is null
    )
  );

create policy "store_claim_requests_cancel_own_pending" on public.store_claim_requests
  for update to authenticated
  using (requester_user_id = (select auth.uid()) and status = 'pending')
  with check (
    requester_user_id = (select auth.uid())
    and status = 'cancelled'
    and decided_by is null
  );

create or replace function public.request_store_claim(
  p_store_id uuid,
  p_message text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester uuid := (select auth.uid());
  v_request_id uuid;
  v_message text := btrim(coalesce(p_message, ''));
begin
  if v_requester is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if char_length(v_message) > 1000 then
    raise exception 'Claim request message must be 1000 characters or less.' using errcode = '22023';
  end if;

  if not exists (select 1 from public.stores where id = p_store_id) then
    raise exception 'Store not found.' using errcode = '02000';
  end if;

  if exists (select 1 from public.stores where id = p_store_id and owner_user_id is not null) then
    raise exception 'This shop already has an owner. Contact the current owner or support for transfer.' using errcode = '23505';
  end if;

  insert into public.store_claim_requests (store_id, requester_user_id, message)
  values (p_store_id, v_requester, v_message)
  on conflict (store_id) where status = 'pending'
  do update set message = excluded.message,
                updated_at = now()
  where public.store_claim_requests.requester_user_id = v_requester
  returning id into v_request_id;

  if v_request_id is null then
    raise exception 'This shop already has a pending claim request.' using errcode = '23505';
  end if;

  return v_request_id;
end;
$$;

create or replace function public.cancel_store_claim_request(p_request_id uuid)
returns public.store_claim_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.store_claim_requests;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  update public.store_claim_requests
  set status = 'cancelled', updated_at = now()
  where id = p_request_id
    and requester_user_id = (select auth.uid())
    and status = 'pending'
  returning * into v_request;

  if v_request.id is null then
    raise exception 'Pending claim request not found for current user.' using errcode = '42501';
  end if;

  return v_request;
end;
$$;

create or replace function public.approve_store_claim_request(
  p_request_id uuid,
  p_owner_user_id uuid default null,
  p_decision_note text default ''
)
returns public.stores
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := (select auth.uid());
  v_role text := (select auth.role());
  v_request public.store_claim_requests;
  v_store public.stores;
  v_new_owner uuid;
  v_note text := btrim(coalesce(p_decision_note, ''));
begin
  if v_role <> 'service_role' and v_actor is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if char_length(v_note) > 1000 then
    raise exception 'Decision note must be 1000 characters or less.' using errcode = '22023';
  end if;

  select * into v_request
  from public.store_claim_requests
  where id = p_request_id
    and status = 'pending'
  for update;

  if v_request.id is null then
    raise exception 'Pending claim request not found.' using errcode = '02000';
  end if;

  select * into v_store
  from public.stores
  where id = v_request.store_id
  for update;

  if v_store.id is null then
    raise exception 'Store not found.' using errcode = '02000';
  end if;

  if v_role <> 'service_role' and (v_store.owner_user_id is null or v_store.owner_user_id <> v_actor) then
    raise exception 'Only the current owner or service role can approve a shop claim.' using errcode = '42501';
  end if;

  v_new_owner := coalesce(p_owner_user_id, v_request.requester_user_id);
  if not exists (select 1 from public.profiles where id = v_new_owner) then
    raise exception 'New owner profile not found.' using errcode = '23503';
  end if;

  update public.stores
  set owner_user_id = v_new_owner,
      updated_at = now()
  where id = v_request.store_id
  returning * into v_store;

  update public.store_claim_requests
  set status = 'approved',
      decided_by = case when v_role = 'service_role' then null else v_actor end,
      decided_at = now(),
      decision_note = v_note,
      updated_at = now()
  where id = p_request_id;

  update public.store_claim_requests
  set status = 'denied',
      decided_by = case when v_role = 'service_role' then null else v_actor end,
      decided_at = now(),
      decision_note = 'Another claim request was approved.',
      updated_at = now()
  where store_id = v_request.store_id
    and id <> p_request_id
    and status = 'pending';

  return v_store;
end;
$$;

create or replace function public.deny_store_claim_request(
  p_request_id uuid,
  p_decision_note text default ''
)
returns public.store_claim_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := (select auth.uid());
  v_role text := (select auth.role());
  v_request public.store_claim_requests;
  v_store_owner uuid;
  v_note text := btrim(coalesce(p_decision_note, ''));
begin
  if v_role <> 'service_role' and v_actor is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if char_length(v_note) > 1000 then
    raise exception 'Decision note must be 1000 characters or less.' using errcode = '22023';
  end if;

  select * into v_request
  from public.store_claim_requests
  where id = p_request_id
    and status = 'pending'
  for update;

  if v_request.id is null then
    raise exception 'Pending claim request not found.' using errcode = '02000';
  end if;

  select owner_user_id into v_store_owner
  from public.stores
  where id = v_request.store_id;

  if v_role <> 'service_role' and (v_store_owner is null or v_store_owner <> v_actor) then
    raise exception 'Only the current owner or service role can deny a shop claim.' using errcode = '42501';
  end if;

  update public.store_claim_requests
  set status = 'denied',
      decided_by = case when v_role = 'service_role' then null else v_actor end,
      decided_at = now(),
      decision_note = v_note,
      updated_at = now()
  where id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;

create or replace function public.establish_store_owner(
  p_store_id uuid,
  p_owner_user_id uuid,
  p_decision_note text default 'Owner established by service role.'
)
returns public.stores
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store public.stores;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Only service role can establish shop ownership.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = p_owner_user_id) then
    raise exception 'Owner profile not found.' using errcode = '23503';
  end if;

  update public.stores
  set owner_user_id = p_owner_user_id,
      updated_at = now()
  where id = p_store_id
  returning * into v_store;

  if v_store.id is null then
    raise exception 'Store not found.' using errcode = '02000';
  end if;

  update public.store_claim_requests
  set status = 'denied',
      decided_by = null,
      decided_at = now(),
      decision_note = btrim(coalesce(p_decision_note, 'Owner established by service role.')),
      updated_at = now()
  where store_id = p_store_id
    and status = 'pending';

  return v_store;
end;
$$;

create or replace function public.transfer_store_owner(
  p_store_id uuid,
  p_new_owner_user_id uuid
)
returns public.stores
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := (select auth.uid());
  v_role text := (select auth.role());
  v_store public.stores;
begin
  if v_role <> 'service_role' and v_actor is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select * into v_store
  from public.stores
  where id = p_store_id
  for update;

  if v_store.id is null then
    raise exception 'Store not found.' using errcode = '02000';
  end if;

  if v_role <> 'service_role' and v_store.owner_user_id <> v_actor then
    raise exception 'Only the current owner or service role can transfer a shop.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = p_new_owner_user_id) then
    raise exception 'New owner profile not found.' using errcode = '23503';
  end if;

  update public.stores
  set owner_user_id = p_new_owner_user_id,
      updated_at = now()
  where id = p_store_id
  returning * into v_store;

  return v_store;
end;
$$;

create or replace function public.revoke_store_owner(p_store_id uuid)
returns public.stores
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store public.stores;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Only service role can revoke shop ownership.' using errcode = '42501';
  end if;

  update public.stores
  set owner_user_id = null,
      updated_at = now()
  where id = p_store_id
  returning * into v_store;

  if v_store.id is null then
    raise exception 'Store not found.' using errcode = '02000';
  end if;

  return v_store;
end;
$$;

comment on table public.store_claim_requests is 'Verified shop ownership requests. Pending requests do not grant write access; approval/establish/transfer functions are the only supported owner change paths.';
comment on function public.request_store_claim(uuid, text) is 'Authenticated requester creates or updates their pending claim request for an unowned shop; does not change ownership.';
comment on function public.approve_store_claim_request(uuid, uuid, text) is 'Current owner or service role approves a pending claim and assigns owner_user_id.';
comment on function public.deny_store_claim_request(uuid, text) is 'Current owner or service role denies a pending shop claim request.';
comment on function public.establish_store_owner(uuid, uuid, text) is 'Service-role/admin path to assign an owner without a pending request.';
comment on function public.transfer_store_owner(uuid, uuid) is 'Current owner or service-role/admin path to transfer shop ownership.';
comment on function public.revoke_store_owner(uuid) is 'Service-role/admin path to clear shop ownership.';

revoke all on public.store_claim_requests from anon;
grant select, insert on public.store_claim_requests to authenticated;

revoke execute on function public.request_store_claim(uuid, text) from public;
revoke execute on function public.cancel_store_claim_request(uuid) from public;
revoke execute on function public.approve_store_claim_request(uuid, uuid, text) from public;
revoke execute on function public.deny_store_claim_request(uuid, text) from public;
revoke execute on function public.establish_store_owner(uuid, uuid, text) from public;
revoke execute on function public.transfer_store_owner(uuid, uuid) from public;
revoke execute on function public.revoke_store_owner(uuid) from public;

grant execute on function public.request_store_claim(uuid, text) to authenticated;
grant execute on function public.cancel_store_claim_request(uuid) to authenticated;
grant execute on function public.approve_store_claim_request(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.deny_store_claim_request(uuid, text) to authenticated, service_role;
grant execute on function public.establish_store_owner(uuid, uuid, text) to service_role;
grant execute on function public.transfer_store_owner(uuid, uuid) to authenticated, service_role;
grant execute on function public.revoke_store_owner(uuid) to service_role;

-- Keep direct table UPDATE available only for editable profile columns from the
-- prior profile API migration. owner_user_id changes must go through RPCs above.
revoke update on public.stores from authenticated;
grant update (name, description, website_url, location, city, avatar_url, cover_image_url, specialties, updated_at)
  on public.stores to authenticated;
