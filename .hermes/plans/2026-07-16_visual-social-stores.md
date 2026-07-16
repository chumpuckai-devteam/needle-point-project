# Needlepoint — Visual Social + Stores (not marketplace)

**Product thesis:** Instagram for needlepoint promotion × Foursquare-ish local/online shop discovery × light Shopify store presence. **No checkout / marketplace yet.**

## North star
Users post **photo-first** projects to promote their work and identity. **Local and online stores** claim presence on the platform and connect as **suppliers** of canvases, kits, threads, and finishing that stitchers promote. Stores grow followers through UGC; stitchers get “shop the look” without us handling payments.

## Core loop
1. Stitcher uploads visual project / progress  
2. Tags craft metadata + optional **Available at** store(s)  
3. Feed/profile grid surfaces photos  
4. Tap project → creator + store links  
5. Store page shows products (link-out) + projects that tagged them  
6. Follow creators and stores  

## Explicit non-goals (now)
- Cart, checkout, Stripe Connect, inventory, shipping rates, multi-vendor payouts  
- Full Etsy clone  
- Heavy text social / vanity metrics as primary UI  

## Architecture
Stay **Vite + React + Supabase**. Add:
- `stores`, `store_products` (catalog cards), `project_stores` (project ↔ store)
- Photo-first UI (visual feed, profile grid)
- Nav: Home, Discover, Stores, Journal, Saved, Account  

## Phases

### Phase V1 — Visual social (Instagram layer) ✅ this sprint
- Home: photo grid feed + compact actions  
- Profile: Instagram-style square project grid  
- Discover: visual grid primary  
- Project cards: image-forward tiles  

### Phase V2 — Stores presence (this sprint foundation)
- Schema: stores (local | online | both), location, website, ships flag  
- Store list + store detail routes  
- Seed 2–3 demo stores  
- Project ↔ store “Available at”  
- Store page: linked projects  

### Phase V3 — Store catalog + connection (next)
- `store_products` CRUD (name, photo, price text, external URL)  
- Shop the look on project detail  
- Follow stores  
- Owner: attach store when creating/editing project  

### Phase V4 — Local discovery (later)
- Zip / radius for local LNS  
- Map or city browse  
- Claim store + verification  

### Phase V5 — Commerce (only when demand is clear)
- Inquiries → optional Stripe Connect  
- Analytics: outbound clicks, store follows  

## Success metrics
- % sessions that open a project from the visual feed  
- Projects with ≥1 photo  
- Store profile views / outbound link clicks  
- Follows of creators + stores  

## Implementation notes
- Dual-mode app remains: demo localStorage without env; Supabase when configured  
- RLS: public read stores/products; store owners manage own rows later; for MVP seed stores are public read, admin/service write  
- Reuse existing image upload for product photos later  
