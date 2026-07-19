# Outbound click events + no-PII contract

## Goal
Track whether Needlepoint drives traffic to shop-owned destinations without turning link-outs into checkout/marketplace behavior. Instrument only user-initiated outbound clicks for product Shop links and store website links.

## Events

### `shop_link_click`
Fires when a user intentionally clicks a product outbound link, such as the `Shop` CTA in the project "Shop the look" rail or a store product card. Fire immediately before opening the external destination. Do not fire for render/impression, hover, prefetch, disabled/missing URLs, automated tests unless the test simulates a real click, or programmatic redirects.

Required payload:
- `event_name`: `shop_link_click`
- `product_id`: stable `store_products.id`
- `store_id`: stable `stores.id`
- `destination_type`: `product_external_url`
- `destination_host`: normalized host only, lowercased, with no path, query, fragment, username/password, or port unless the port is required to distinguish a non-production host
- `surface`: product surface where the click happened, e.g. `project_shop_the_look`, `store_products_grid`
- `placement`: optional stable placement/CTA label, e.g. `shop_cta`, `product_card`
- `occurred_at`: server-side timestamp preferred; client timestamp may be sent only as advisory metadata if needed

### `store_website_click`
Fires when a user intentionally clicks a store-level outbound website link, such as `Visit website` on a store detail page. Fire immediately before opening the external destination. Do not fire for render/impression, hover, prefetch, disabled/missing URLs, automated redirects, or product-specific links.

Required payload:
- `event_name`: `store_website_click`
- `store_id`: stable `stores.id`
- `destination_type`: `store_website_url`
- `destination_host`: normalized host only, lowercased, with no path, query, fragment, username/password, or token-bearing port
- `surface`: store surface where the click happened, e.g. `store_detail`
- `placement`: optional stable placement/CTA label, e.g. `visit_website_cta`
- `occurred_at`: server-side timestamp preferred; client timestamp may be sent only as advisory metadata if needed

## No-PII / minimization contract
Allowed properties are stable non-PII identifiers and coarse product analytics context only:
- Stable IDs: `product_id`, `store_id`.
- Event routing/context: `event_name`, `destination_type`, `destination_host`, `surface`, `placement`.
- Timing: server-created `occurred_at`; optional `event_date` generated from it for aggregation.

Explicitly forbidden in payloads, database rows, client logs, server logs, and error logs:
- Email, name, phone, handle/display name if not necessary for the event, auth tokens, session tokens, or payment/order details.
- Full outbound URLs, paths, query strings, fragments, UTM values, referral codes, coupon codes, usernames/passwords in URLs, or any URL value that could carry PII.
- User-generated content such as project notes, comments, product/store descriptions, search terms, free-text form values, or message bodies.
- IP address, precise geo coordinates, precise user location, raw user agent, advertising IDs, fingerprinting IDs, device identifiers, or any identifier beyond what Supabase/platform infrastructure already anonymizes/aggregates.
- Browser/local storage IDs or custom anonymous IDs unless product explicitly approves a separate analytics identity design.

Implementation detail: normalize the destination client-side or server-side with `new URL(url).hostname.toLowerCase()` and send/store only the hostname. If URL parsing fails, either omit `destination_host` or store `unknown`; never fall back to the raw URL.

## Recommended storage
Use a simple Supabase table unless PostHog is already wired and approved in this repo. Current app dependencies already include Supabase and do not show PostHog, so Supabase is the preferred implementation path.

Suggested table shape:
- `id uuid primary key default gen_random_uuid()`
- `event_name text not null check (event_name in ('shop_link_click', 'store_website_click'))`
- `product_id uuid null references public.store_products(id) on delete set null`
- `store_id uuid not null references public.stores(id) on delete cascade`
- `destination_type text not null check (destination_type in ('product_external_url', 'store_website_url'))`
- `destination_host text null`
- `surface text not null`
- `placement text null`
- `occurred_at timestamptz not null default now()`
- generated/indexed day: either `event_day date generated always as ((occurred_at at time zone 'utc')::date) stored` if supported, or query `date_trunc('day', occurred_at)`.

RLS / write contract:
- Public/anon insert is acceptable only if the table columns are strictly constrained to this no-PII schema and no raw JSON payload column exists.
- Do not add `payload jsonb`, `metadata jsonb`, `user_id`, `session_id`, `ip`, or `user_agent` columns for this slice.
- Reads should be restricted to service role/admin or via a narrow aggregate RPC/view if counts need to appear in product/admin UI.

Useful indexes:
- `(event_name, occurred_at)`
- `(product_id, occurred_at)` where `product_id is not null`
- `(store_id, occurred_at)`

Basic count query by day:

```sql
select
  event_name,
  product_id,
  store_id,
  date_trunc('day', occurred_at)::date as event_day,
  count(*) as click_count
from public.outbound_click_events
where occurred_at >= $1
  and occurred_at < $2
  and ($3::uuid is null or product_id = $3)
  and ($4::uuid is null or store_id = $4)
group by event_name, product_id, store_id, event_day
order by event_day desc, click_count desc;
```

## Frontend implementation notes
- Add a tiny tracking helper rather than duplicating payload construction in components.
- Call the helper from click handlers on existing outbound anchors, then allow the browser to open the link. Use best-effort insert; tracking failure must not block navigation.
- For `target="_blank"` links, prefer `navigator.sendBeacon` to an Edge Function or a short Supabase insert with `void`/best-effort handling. If the insert is async, do not delay navigation beyond a very small best-effort window.
- Validate that product clicks include both `product_id` and `store_id`; store website clicks include `store_id` and no `product_id`.
- Keep console logging off in production. If a development log is needed, log only event name + IDs + host, never the source URL.

## Acceptance criteria for engineering
- Product outbound clicks fire exactly one `shop_link_click` per user-initiated click on a product `Shop` link with `product_id`, `store_id`, destination host/type, surface, and optional placement.
- Store website clicks fire exactly one `store_website_click` per user-initiated click on a store `Visit website` link with `store_id`, destination host/type, surface, and optional placement.
- No event is emitted for impressions, hovers, missing URLs, prefetches, automatic redirects, or render-time code paths.
- Event payloads, database schema, and logs contain no PII and never store full URLs or query strings.
- Counts are queryable by `event_name`, `product_id`, `store_id`, and day for product and store destinations.
- Tracking is best-effort and never prevents the user from leaving Needlepoint via the clicked outbound link.
