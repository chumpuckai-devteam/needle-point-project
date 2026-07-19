# Needlepoint post-V3 beta backlog vs peers

**Type:** Competitive / UX research brief (no implementation)  
**Audience:** Samir + product-analyst (phase-epic drafting) + Tech Lead  
**Date:** 2026-07-19  
**Prod baseline:** https://needle-point-project.vercel.app  
**Shipped:** V1 visual social (Craft Studio) · V2 stores presence · V3 catalog + follow stores + Shop the look + beta owner product CRUD  
**Hard non-goals until explicit:** cart · Stripe / Connect · multi-vendor payouts · DMs · native apps

---

## 1. Executive recommendation

Needlepoint already owns the right **wedge shape** for beta: photo-first craft journals + local/online shops + link-out catalog + Shop the look — **without** becoming Etsy or IG Checkout.

Peers show four durable bet themes for the next 2–4 phases:

| Priority | Bet theme | Why peers prove it | Board mapping (existing) |
|----------|-----------|--------------------|---------------------------|
| **P0** | **Make the V3 loop trustworthy** | Broken shop↔project links kill Pinterest/IG-style shop-the-look value | Epic H (H1 hydrate, H2 demo follow) |
| **P0–P1** | **Owner trust + merchandising** | Nextdoor claim/verify + IG/Pinterest shop profiles + LoveCrafts designer tooling | Epic B (B1 claim, B2 profile, B3 photos, B6 security) |
| **P1** | **Follow graph utility + save density** | IG follow feed · Ravelry friends activity · Pinterest boards · Ravelry queue/favorites | B4 followed-stores rail · Epic P (P1 collections, P4 onboarding rank) |
| **P1–P2** | **Intent → offsite signal** | Pinterest product tagging intent · LoveCrafts/Etsy conversion paths · PRD affiliate tracking | B5 outbound clicks · P6 creator link tracking |
| **P2** | **Local LYS discovery depth** | Ravelry yarn-shop directory · Nextdoor local pages · Maps claim | Epic L (zip/city/map) — after owner surfaces are real |
| **P2** | **Community anchors (not chat)** | Ravelry groups/KALs · PRD stitch-alongs · Ribblr community | P3 multi SAL · **not** DMs |
| **Park** | Commerce / chat / native / search infra | Explicit non-goals + marketplace creep risk in PRD | Epic X |

**Default next sprint (research view):**  
`H1 → H2 → B1 + B6 → B2 + B3 → B4 + B5 → Q1`  
then densify with `P1 + P4 + P2`, then `L*`, then `P3`.

Do **not** start Epic X or in-app checkout until outbound clicks + follows prove demand.

---

## 2. Peer set (why these five)

| Peer | Role vs Needlepoint | Closest surface |
|------|---------------------|-----------------|
| **Ravelry** | Craft utility bible (knit/crochet) | Project notebook, stash/queue, pattern+yarn DB, friends activity, LYS directory, groups — **not** visual-first |
| **Pinterest** | Inspiration → shop intent | Boards, product tagging on lifestyle pins, shoppable collages, SEO discovery |
| **Instagram** | Visual social + shoppable posts | Follow graph, product tags on posts/Reels, business Shop tab (checkout-heavy) |
| **LoveCrafts** | Craft marketplace + designer tooling | Pattern sell, materials catalog, project library, collections, email merchandising |
| **Nextdoor (shops)** + **Ribblr (secondary)** | Local claim/trust; mobile craft social | Verified business pages / recommendations; interactive patterns + community |

**Not primary peers for beta ordering:** Etsy (pure marketplace), TikTok Shop (live commerce), full Shopify (store OS). Cite them only as **anti-goals** or late options.

---

## 3. Needlepoint current position (facts)

From README + V3 plan + program M0:

**In product today**
- Craft Studio photo-first feed (Moss & Flax; deliberately not X-clone)
- Auth: separate `/auth` + `/auth/signup`
- Project journal, likes, comments, creator follows, collections (basic), stitch-along
- Stores list/detail; proximity ~60 mi + top-online fallback
- Catalog cards (link-out); Available at tags; Shop the look; follow store
- Owner product CRUD + beta claim shop

**Known fragile points (planning inputs, not QA substitutes)**
- Prod hydrate bug for `project.storeIds` empties Shop the look / store project grids (board H1)
- Demo owner blanket-true hides Follow (board H2)
- Claim is beta-open; security advisors / RLS hygiene still a first-class theme (B1, B6, security audit sibling)

**Explicit product thesis (internal plan)**  
Instagram-for-needlepoint promotion × Foursquare-ish shop discovery × light Shopify presence — **no checkout yet**.

---

## 4. Dimension comparison

### 4.1 Discovery

| Peer | Pattern | Evidence / notes |
|------|---------|------------------|
| **Ravelry** | Structured search over patterns, projects, yarns, designers, **yarn shops**; hundreds of filters; user-built DB | About page positions “the Database” as core; advanced search is the retention moat |
| **Pinterest** | Visual infinite discovery + boards; shopping native across feed (not a siloed shop tab only) | Business shopping: product pins + tagging; boards carry SEO traffic |
| **Instagram** | Explore + follow graph + hashtags; Shopping tab for brands | Visual first; weak craft metadata |
| **LoveCrafts** | Merchandised catalog + patterns + blog/how-tos; email features designers | Designer handbook emphasizes featured placement / newsletters |
| **Ribblr** | Trending interactive patterns; mobile search/filters; community forum adjacent | App store positioning: discover + personalize patterns |

**Implication for Needlepoint**
- Keep **craft filters** (difficulty, stitch, color, status) — Ravelry-grade structure is a differentiator vs IG.
- Invest in **cold-start seed + empty states** (Q5 / content) before Algolia (X4 parked).
- Onboarding interests → ranked Studio/Discover (P4) is the lightweight personalization peers use without ML infra.
- Visual grid stays primary (Pinterest/IG); avoid Ravelry’s dense chrome as default UI.

**Beta fit:** interest-ranked feed, richer seed, filter polish.  
**Later:** advanced pattern DB, Algolia-class search.

---

### 4.2 Follow graph & engagement

| Peer | Pattern |
|------|---------|
| **Instagram** | Follow is the feed spine; creator growth loop |
| **Ravelry** | “Friends” activity stream (project photos, queue, stash, favorites) — utility social, not vanity metrics |
| **Pinterest** | Weak social graph; **saves/boards** dominate |
| **LoveCrafts / Ribblr** | Follow designers + community/events; less pure social graph than IG |

**Implication**
- Needlepoint already has creator + store follows — good IG/Ravelry hybrid.
- Gap vs peers: **followed entities must appear on home** (B4 followed-stores rail; creator updates already partially present). Ravelry’s friends activity shows utility of “people I care about made progress.”
- Saves/collections need multi-board depth (P1) — Pinterest’s core habit; Ravelry favorites/library/queue.
- Comments/likes stay lightweight; **do not** chase IG vanity or open DMs (X2).

**Beta fit:** surface follows, multi-collections, progress prompts.  
**Anti-goal:** chat, Stories clones, algorithmic doomscroll without craft utility.

---

### 4.3 Store / catalog merchandising

| Peer | Pattern |
|------|---------|
| **Instagram** | Business Shop storefront + product catalog + tags up to ~20 products/post |
| **Pinterest** | Merchant catalog API; Shop tab on business profile; product pins |
| **LoveCrafts** | Full materials + pattern commerce; simple designer upload / Ravelry import |
| **Nextdoor** | Claim page → logo/cover/categories → recommendations; verification builds trust |
| **Ravelry** | Yarn shop directory + brand pages; pattern sales for designers (marketplace fees later) |
| **Etsy** (contrast) | Full multi-vendor checkout — **parked** |

**Implication**
1. **Claim + ownership UX** is table stakes (Nextdoor/Google Business pattern). Open beta claim without verification will not scale to real LNS owners (B1).
2. **Owner profile polish** (name, bio, website, city, avatar/cover, specialties) is what makes a shop feel real before any cart (B2).
3. **Product photos via upload** beat image-URL-only forms (B3) — every peer with a catalog assumes media upload.
4. Catalog stays **link-out cards** with price **labels**, not inventory SKUs.

**Beta fit:** B1–B3, B6.  
**Later:** inventory, shipping, multi-vendor payouts.

---

### 4.4 Shop-the-look style flows

| Peer | Pattern | Signal |
|------|---------|--------|
| **Pinterest** | Product tagging on lifestyle/scene images; shoppable collages | ~**70% higher shopping intent** on tagged scene images vs standalone product pins (Pinterest business materials) |
| **Instagram** | Product tags on feed/carousel/Reels; tap tag → product | Inspiration → product is the proven commerce UX |
| **Needlepoint V3** | Project → tagged **stores** → product strip (store-level, not pin-on-image) | Correct phase-1; thinner than IG/Pinterest tag precision |

**Implication**
- Protect V3 path: Available at + Shop the look **must work in prod** (H1). Empty strips train users that shops are dead.
- Next craft-specific upgrade (not checkout): optional **product-level** attach on a project (“this canvas / thread set”) vs store-only — closer to Pinterest tagging without Meta catalog infra.
- Outbound click events (B5) are the beta KPI for “shop intent,” analogous to Pinterest shopping intent and PRD “external link clicks.”

**Beta fit:** fix loop → analytics → optional SKU-level tags.  
**Anti-goal:** in-app cart from the look.

---

### 4.5 Creator / owner tooling

| Peer | Pattern |
|------|---------|
| **LoveCrafts** | Designer site: free start, simple upload, Ravelry import, featured in email/social |
| **Ravelry** | Designer storefront inside pattern DB; project notebook as free marketing surface (FO projects drive pattern demand) |
| **Ribblr** | Sell interactive patterns; progress tools inside pattern format |
| **IG/Pinterest** | Creator affiliate / brand product tags; business profiles |
| **Nextdoor** | Owner dashboard for posts/recommendations after claim |

**Implication**
- Needlepoint’s owner CRUD is the right **beta** creator commerce: manage presence + catalog links, not payments.
- Missing vs LoveCrafts/IG: **profile edit**, media upload, simple **performance** (click counts) (B2, B3, B5, P6).
- Missing vs Ravelry: deep project↔pattern graph and stash — **later** density (materials model exists in PRD; not phase-critical vs shop trust).
- Stitch-along host create (P3) is the craft equivalent of Ravelry groups/KALs — high engagement, still not DMs.

---

### 4.6 Local discovery (LYS)

| Peer | Pattern |
|------|---------|
| **Ravelry** | Yarn shops directory in global search surface |
| **Nextdoor** | Hyperlocal business pages; claim; recommendations drive visits |
| **Google Maps** (adjacent) | Zip/city + map is how users already find LNS |

Needlepoint already has lat/lng + 60 mi ranking + online fallback — ahead of many craft socials.

**Implication:** Epic L (zip/city, map/city browse, permission coaching) is high leverage **after** shops look claimable and merchandised. Otherwise local discovery funnels to hollow profiles.

---

### 4.7 Trust, safety, onboarding, SEO

| Theme | Peer cue | Needlepoint beta action |
|-------|----------|-------------------------|
| **Trust** | Nextdoor verification; IG business eligibility; reporting norms | B1 claim path · P2 reporting · B6 advisors · security audit |
| **Onboarding** | IG interests; Pinterest topics; PRD Flow 1 | P4 interest-ranked feed; keep skip |
| **SEO** | Pinterest boards/pins; public project URLs | Public project/store pages shareable; SPA deep-link already fixed; content seed > marketing site |
| **Cold start** | All niche platforms | Seed density + stitch-along flagship (PRD launch strategy) |
| **Moderation** | Pattern IP disputes (PRD risk) | Reporting queue before marketplace |

---

## 5. Recommended bet themes (do-now)

### Theme A — Trust the core loop (engagement foundation)
**Evidence:** Pinterest/IG shop-the-look only works if tags resolve; Ravelry notebook only works if projects stick.  
**Features:** H1 storeIds hydrate · H2 demo follow/owner split · Q4 empty/error states on shop/project · seed content so Discover isn’t empty (Q5).  
**Success metrics:** % projects with Shop the look non-empty when tagged; store detail “projects available here” > 0 for seeded shops.

### Theme B — Shop owner OS (without commerce)
**Evidence:** Nextdoor claim/profile; IG/Pinterest shop tabs; LoveCrafts designer simplicity.  
**Features:** B1 verified/clear claim · B2 profile edit · B3 product photo upload · B6 security hygiene.  
**Success metrics:** claimed shops with complete profile; products with real images; zero non-owner product writes.

### Theme C — Graph utility (follow + save)
**Evidence:** IG follow spine; Ravelry friends activity; Pinterest boards.  
**Features:** B4 followed stores rail · P1 multi-collections · light “people you follow updated projects” if not already strong.  
**Success metrics:** follow → return session; saves per WAU; rail CTR to stores.

### Theme D — Intent measurement (pre-commerce)
**Evidence:** Pinterest shopping intent on tagged scenes; PRD creator link clicks; LoveCrafts merchandising optimization.  
**Features:** B5 product/website outbound events · P6 creator outbound clicks.  
**Success metrics:** outbound clicks / store view; clicks / Shop the look impression. **Gate** for any future Stripe discussion.

### Theme E — Relevance & craft density
**Evidence:** Ravelry filters; PRD metadata differentiators; onboarding interests.  
**Features:** P4 interest ranking · filter/UX polish · materials tags depth only if cheap.  
**Success metrics:** onboarding→first meaningful session; filter usage rate.

### Theme F — Local LYS (phase after B)
**Evidence:** Ravelry shop directory; Nextdoor local; existing 60 mi rank.  
**Features:** L1 zip/city · L2 map/city browse · L3 geo coaching.  
**Success metrics:** local shop views without GPS; online fallback still healthy.

### Theme G — Community anchors (not messaging)
**Evidence:** Ravelry KALs/groups; PRD stitch-along; Ribblr community.  
**Features:** P3 multi SAL + host create; one flagship seeded SAL always live.  
**Success metrics:** join rate; submissions per SAL.  
**Explicitly not:** DMs, group chat (Ribblr-style public chat is optional later and noisy).

### Theme H — Quality bar (parallel tax)
**Evidence:** LoveCrafts wins UX perception vs Ravelry clunkiness in designer commentary; Samir screenshot-driven polish.  
**Features:** Q1 e2e · Q2 mobile dogfood · Q3 App split (maintainability) · contrast/touch fixes.  
**Run as tax on every feature sprint**, not only a late polish dump.

---

## 6. Anti-goals (parked / do-not-start)

Aligned with task non-goals + peer traps:

| Anti-goal | Why peers say wait |
|-----------|--------------------|
| **Cart / Stripe / multi-vendor payouts** | Etsy/LoveCrafts complexity; PRD “marketplace creep”; need outbound intent first |
| **DMs / private messaging** | PRD non-goal; Ravelry thrives with forums/groups first; support cost |
| **Native apps** | Ribblr is app-led but web mobile-first is correct until retention proven |
| **Algolia-class search** | Ravelry-scale DB not yet; Postgres filters enough |
| **Generic IG clone** (Stories, Reels, vanity metrics primary) | PRD differentiator is craft utility + journals |
| **Full pattern marketplace** | Compete with Ravelry/Etsy before density exists |
| **Heavy forums** | Ravelry moat; high mod cost; stitch-alongs are enough community surface |

---

## 7. Proposed phase order (for epic drafting)

Phasing is **product sequencing**, independent of which board IDs already exist. Map onto Epic H/B/P/L/Q/X as shown.

### Phase M1 — Stabilize & prove the V3 loop (1 sprint)
**Goal:** Every dogfood path that demos Shop the look / follow / owner actually works on prod + demo.  
**Include:** H1, H2, critical security fixes from advisors if P0, minimal Q empty-state fixes on store/project.  
**Exit:** Prod Bookshop Door / Canopy-class pages show tagged projects + product strip; demo Follow works; smoke green.  
**Rationale:** Peers’ shoppable inspiration loops fail closed if tags don’t resolve — do not build new surfaces on a broken loop.

### Phase M2 — Owner trust & merchandising (1–2 sprints)
**Goal:** Real LNS/online shops can own a credible storefront (still link-out only).  
**Include:** B1 claim/ownership, B6 security hygiene, B2 profile edit, B3 product photo upload; security review gates.  
**Exit:** Non-owners cannot write; owners edit profile + catalog media; claim path is intentional.  
**Rationale:** Nextdoor/IG/Pinterest all treat claim + rich profile as prerequisite to local/social commerce.

### Phase M3 — Engagement density (1–2 sprints)
**Goal:** Follow graph and saves produce weekly return without chat.  
**Include:** B4 followed-stores rail, P1 multi-collections, P4 onboarding interest ranking, B5 outbound analytics (can start end of M2), P2 reporting MVP, Q1 e2e expansion.  
**Exit:** Home shows followed shops; users create ≥1 named collection; outbound events queryable; abuse report path exists.  
**Rationale:** IG follow + Pinterest save + measurement before monetization (PRD).

### Phase M4 — Local discovery V4 (1 sprint)
**Goal:** Find LNS without perfect GPS; map/city browse.  
**Include:** L1–L3.  
**Depends on:** M2 (shops worth visiting).  
**Rationale:** Ravelry shop directory + Maps habits; empty pretty maps are worse than no map.

### Phase M5 — Community anchors & PRD leftovers (flexible)
**Goal:** Time-bound density and privacy polish.  
**Include:** P3 multi stitch-along + host create; P5 private projects; P6 creator link analytics if not in M3; content seeding ops.  
**Rationale:** Ravelry KAL energy; PRD launch strategy step 3.

### Phase M6+ — Explicitly gated commerce (only with evidence)
**Trigger:** Sustained outbound clicks from Shop the look + store follows from real (non-seed) users; owner demand for in-platform pay.  
**Then consider:** inquiry/lead forms → optional Stripe Connect (old V5 sketch) — still prefer single-shop before multi-vendor payouts.  
**Still deferred:** DMs, native apps, Algolia.

---

## 8. Do-now vs later matrix (feature themes)

| Theme | Do now (beta) | Later |
|-------|---------------|-------|
| Shop the look | Fix hydrate; store-level strip; link-out | Pin-on-image product tags; affiliate network |
| Follows | Creator + store; home rail | Mutual friends, activity privacy controls |
| Collections | Multi named boards | Collaborative boards, SEO public boards |
| Owner tools | Claim, profile, catalog CRUD, photos | Inventory, staff roles, POS |
| Analytics | Outbound click events | Full funnel dashboards, ads |
| Local | Zip/city + coaching after owner quality | Full map product, paid local boost |
| Community | SAL multi + host | Forums, chat, guilds |
| Commerce | — | Cart, Stripe, payouts |
| Platform | Mobile web polish | Native apps |
| Search | Postgres filters + interests | Algolia/Typesense |

---

## 9. Alignment with existing board (sanity check)

Research **supports** the current M0 structure; suggested tweaks for phase-epic authors:

1. **Promote H before B** always (already TL comment).  
2. **B1 + B6 before or with B2/B3** — trust before cosmetics (Nextdoor verify pattern).  
3. **B4 + B5 belong with engagement phase**, not blocked on full local map.  
4. **L after B**, not parallel as equal priority — hollow local shops waste map work.  
5. **P1 + P4** are higher engagement ROI than P3 early, unless a flagship SAL is the launch tactic.  
6. **Q1** as continuous tax; Q3 split is engineering health, schedule when it unblocks velocity.  
7. **X remains X** — research found no reason to unpark commerce/chat/native for beta.

Suggested first Samir-pick sprint (research):  
**H1, H2, B1, B6, B2, B3, B4, Q1** — matches TL “B1–B4 + B6 + Q1” plus hotfixes first.

---

## 10. Open questions (for Samir / product-analyst)

1. **Wedge tightness:** Stay needlepoint-only, or allow adjacent canvaswork tags soon? (PRD open question; peers like Ravelry grew multi-craft.)  
2. **Claim strictness:** Instant self-claim with audit log vs request→approve? (Nextdoor is verify-heavy; beta speed may prefer soft claim + revoke.)  
3. **Shop-the-look depth:** Is store-level enough for beta, or is product-level tagging on projects a M3 must?  
4. **Launch tactic:** One flagship stitch-along (PRD) vs pure shop SEO — affects whether P3 jumps ahead of P1/P4.  
5. **Creator type priority:** LNS owners vs pattern designers vs hobbyist stitchers for next 30 days of seeding?

---

## 11. Sources (facts vs recommendations)

**Facts (peer / product docs & commentary)**
- Ravelry about: notebook + pattern/yarn database + community/groups/friends; yarn shops in search surfaces.  
- Ravelry friends activity: project photos, queue, stash, favorites (community blog / help).  
- Designer comparisons: Ravelry = social + DB + sell; LoveCrafts = friendlier sell UX, lower traffic; Etsy = marketplace fees (The Snugglery and similar designer writeups).  
- Pinterest: product tagging on lifestyle/scene pins; reported higher shopping intent on tagged scene images vs standalone product pins; shopping integrated across experience.  
- Instagram Help: Shops, product tags on posts (limits ~20), shopping from profiles/Reels.  
- Nextdoor Business: claim page, profile completeness, recommendations drive local visits.  
- Ribblr: mobile craft discovery + interactive patterns + community.  
- Internal: PRD.md, README.md, `.hermes/plans/2026-07-16_visual-social-stores.md`, V3 plan, board M0 epics H/B/P/L/Q/X.

**Recommendations** in §§1, 5–9 are synthesis for Needlepoint beta ordering, not peer claims.

---

## 12. Acceptance checklist (this brief)

- [x] 3–5 peers compared on discovery, follow-graph, store/catalog, shop-the-look, owner tooling  
- [x] Feature themes mapped to peer evidence  
- [x] Clear do-now vs later split respecting cart/Stripe/DMs/native non-goals  
- [x] Proposed phase order with rationale usable by phase-epic drafting  
- [x] No implementation / no code changes required  

**Downstream:** `t_24b10108` Draft M1–M4 phase epics should consume §§5–9.
