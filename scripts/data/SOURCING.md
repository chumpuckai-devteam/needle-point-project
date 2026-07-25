# Real LNS store sourcing

Goal: every row in `real-lns-catalog.json` is a **real** needlepoint / needlework shop (or clearly labeled online designer), never a synthetic “City Canvas Loft” placeholder.

## Acceptance checklist (required for every add)

1. **Name** matches the public business name (Apple Maps / Google / site).
2. **Website** is the shop’s own domain — **never** `example.com`, link shorteners, or social-only.
3. **City + region** match the brick-and-mortar (or blank city + `store_type: online` for pure online).
4. **Coords** from Maps/OSM when local; `null` only for pure online.
5. **Handle** stable slug (`kickassneedlepoint`), unique in catalog + DB.
6. **Source note** in commit message or `source_notes`: URL(s) you verified.
7. **Not a finished-goods-only craft chain** unless they truly stock needlepoint canvases/threads as an LNS.

## Preferred intake order (best → OK)

| Rank | Method | How |
|------|--------|-----|
| 1 | **Shop self-claim** | Owner claims directory row → mod approves → they edit address/site. Highest trust after approve. |
| 2 | **Official site + Maps** | Homepage + Apple/Google place card agree on name/city. |
| 3 | **Curated community lists** | Cross-check 2+ sources (Maps + site). Do not bulk-import unreviewed CSV. |
| 4 | **User tip with Maps link** | Resolve place → run checklist → add one row. Short links can 404 outside Apple app — ask for **name + city** if resolve fails. |

**Do not:** generate density fakes, scrape paywalled directories into prod without review, or keep `example.com` rows.

## Metro completeness pass (repeatable)

When filling a metro (e.g. Nashville):

1. Search Apple/Google: `needlepoint shop {city}` + `needlework shop {city}`.
2. List every place with ≥~10 reviews or a real website.
3. Diff against `real-lns-catalog.json` handles/names.
4. Add missing rows; fix wrong city (e.g. Brentwood vs Nashville).
5. `npm run seed:stores` (upsert only — does not delete unknown owned shops).
6. Spot-check `/stores?city=…` and map pins on prod.

## Commands

```bash
# Edit catalog
$EDITOR scripts/data/real-lns-catalog.json

# Validate basics
node scripts/validate-real-lns-catalog.mjs

# Push to Supabase + copy into src/data
npm run seed:stores
```

## Apple Maps short links

`https://maps.apple/p/…` often **does not resolve** from servers/bots (404 / address-only). Prefer:

- Full share: name + address from the place card, or  
- `https://maps.apple.com/place?place-id=…` when available, or  
- Shop website URL.

## Nashville baseline (2026-07-25)

- Kick Ass Needlepoint — kickassneedlepoint.com  
- The Stitching Belle — thestitchingbelle.com  
- Nashville Needleworks — nashvilleneedleworks.com (Brentwood area)
