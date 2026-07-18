-- Add coordinates for proximity-ranked local shops
alter table public.stores
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

create index if not exists stores_geo_idx on public.stores (latitude, longitude)
  where latitude is not null and longitude is not null;

update public.stores
set latitude = 30.2711286, longitude = -97.7436995
where handle = 'bookshopwindows';

update public.stores
set latitude = 45.5202471, longitude = -122.674194
where handle = 'canopycanvas';
