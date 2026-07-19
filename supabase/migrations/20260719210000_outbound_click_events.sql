-- Outbound click analytics: no-PII product/shop link-out events.
-- Stores only stable IDs, coarse surface metadata, normalized destination host,
-- and server timestamps. Raw rows are write-only for anon/auth clients; aggregate
-- counts are exposed through outbound_click_event_counts().

create table if not exists public.outbound_click_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  product_id uuid references public.store_products (id) on delete set null,
  store_id uuid not null references public.stores (id) on delete cascade,
  destination_type text not null,
  destination_host text,
  surface text not null,
  placement text,
  occurred_at timestamptz not null default now(),
  constraint outbound_click_events_event_name_check
    check (event_name in ('shop_link_click', 'store_website_click')),
  constraint outbound_click_events_destination_type_check
    check (destination_type in ('product_external_url', 'store_website_url')),
  constraint outbound_click_events_shape_check
    check (
      (
        event_name = 'shop_link_click'
        and product_id is not null
        and destination_type = 'product_external_url'
      )
      or (
        event_name = 'store_website_click'
        and product_id is null
        and destination_type = 'store_website_url'
      )
    ),
  constraint outbound_click_events_destination_host_safe_check
    check (
      destination_host is null
      or (
        destination_host = lower(destination_host)
        and char_length(destination_host) between 1 and 253
        and destination_host !~ '[/?#@]'
      )
    ),
  constraint outbound_click_events_surface_safe_check
    check (surface ~ '^[a-z0-9_:-]{1,80}$'),
  constraint outbound_click_events_placement_safe_check
    check (placement is null or placement ~ '^[a-z0-9_:-]{1,80}$')
);

create index if not exists outbound_click_events_event_occurred_idx
  on public.outbound_click_events (event_name, occurred_at desc);

create index if not exists outbound_click_events_product_occurred_idx
  on public.outbound_click_events (product_id, occurred_at desc)
  where product_id is not null;

create index if not exists outbound_click_events_store_occurred_idx
  on public.outbound_click_events (store_id, occurred_at desc);

alter table public.outbound_click_events enable row level security;

-- Link-out analytics are intentionally write-only to the public clients. The
-- table has no select policy; aggregate reads go through the narrow RPC below.
drop policy if exists "outbound_click_events_insert_anon_auth" on public.outbound_click_events;
create policy "outbound_click_events_insert_anon_auth"
  on public.outbound_click_events
  for insert
  to anon, authenticated
  with check (true);

create or replace function public.outbound_click_event_counts(
  p_event_name text default null,
  p_product_id uuid default null,
  p_store_id uuid default null,
  p_start_at timestamptz default null,
  p_end_at timestamptz default null
)
returns table (
  event_name text,
  product_id uuid,
  store_id uuid,
  event_day date,
  click_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    oce.event_name,
    oce.product_id,
    oce.store_id,
    date_trunc('day', oce.occurred_at)::date as event_day,
    count(*)::bigint as click_count
  from public.outbound_click_events oce
  where (p_event_name is null or oce.event_name = p_event_name)
    and (p_product_id is null or oce.product_id = p_product_id)
    and (p_store_id is null or oce.store_id = p_store_id)
    and (p_start_at is null or oce.occurred_at >= p_start_at)
    and (p_end_at is null or oce.occurred_at < p_end_at)
  group by oce.event_name, oce.product_id, oce.store_id, event_day
  order by event_day desc, click_count desc;
$$;

comment on table public.outbound_click_events
  is 'Write-only no-PII outbound click analytics for product shop links and store website links. Stores normalized destination_host only; never full outbound URLs.';
comment on function public.outbound_click_event_counts(text, uuid, uuid, timestamptz, timestamptz)
  is 'Aggregate outbound click counts by event/product/store/day over an optional time range. Does not expose raw event rows.';

revoke all on public.outbound_click_events from anon, authenticated;
grant insert on public.outbound_click_events to anon, authenticated;

revoke all on function public.outbound_click_event_counts(text, uuid, uuid, timestamptz, timestamptz) from public;
grant execute on function public.outbound_click_event_counts(text, uuid, uuid, timestamptz, timestamptz) to authenticated, service_role;
