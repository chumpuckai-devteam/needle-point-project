-- Stores + project associations (visual social × shop presence; no marketplace checkout)

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles (id) on delete set null,
  name text not null,
  handle text not null unique,
  store_type text not null default 'online' check (store_type in ('local', 'online', 'both')),
  description text not null default '',
  avatar_url text not null default '',
  cover_image_url text not null default '',
  website_url text not null default '',
  location text not null default '',
  city text not null default '',
  region text not null default '',
  country text not null default 'US',
  ships_nationwide boolean not null default true,
  specialties text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  description text not null default '',
  image_url text not null default '',
  price_label text not null default '',
  external_url text not null default '',
  category text not null default 'canvas',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.project_stores (
  project_id uuid not null references public.projects (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  role text not null default 'available_at' check (role in ('available_at', 'pattern_from', 'threads_from', 'finishing')),
  created_at timestamptz not null default now(),
  primary key (project_id, store_id, role)
);

create index if not exists stores_handle_idx on public.stores (handle);
create index if not exists store_products_store_idx on public.store_products (store_id);
create index if not exists project_stores_store_idx on public.project_stores (store_id);
create index if not exists project_stores_project_idx on public.project_stores (project_id);

alter table public.stores enable row level security;
alter table public.store_products enable row level security;
alter table public.project_stores enable row level security;

drop policy if exists "stores_public_read" on public.stores;
create policy "stores_public_read" on public.stores for select using (true);

drop policy if exists "stores_owner_write" on public.stores;
create policy "stores_owner_write" on public.stores for all using (
  owner_user_id = auth.uid() or auth.uid() is not null
) with check (
  owner_user_id = auth.uid() or auth.uid() is not null
);

drop policy if exists "store_products_public_read" on public.store_products;
create policy "store_products_public_read" on public.store_products for select using (true);

drop policy if exists "store_products_auth_write" on public.store_products;
create policy "store_products_auth_write" on public.store_products for all using (
  exists (select 1 from public.stores s where s.id = store_id and (s.owner_user_id = auth.uid() or auth.uid() is not null))
) with check (
  exists (select 1 from public.stores s where s.id = store_id and (s.owner_user_id = auth.uid() or auth.uid() is not null))
);

drop policy if exists "project_stores_public_read" on public.project_stores;
create policy "project_stores_public_read" on public.project_stores for select using (true);

drop policy if exists "project_stores_owner_write" on public.project_stores;
create policy "project_stores_owner_write" on public.project_stores for all using (
  exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
);
