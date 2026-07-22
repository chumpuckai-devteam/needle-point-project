-- Product-level Shop the look tags (applied live via MCP as project_product_tags_shop_the_look)
create table if not exists public.project_products (
  project_id uuid not null references public.projects (id) on delete cascade,
  product_id uuid not null references public.store_products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, product_id)
);
