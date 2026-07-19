import { expect, test } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";

import {
  normalizeStoreDiscoveryInput,
  normalizeStoreSearchQuery,
  storeDiscoveryResponseFromStores,
  type StoreDiscoveryInput,
} from "../src/api/stores";
import type { Store } from "../src/types";

const root = cwd();
const migrationsDir = join(root, "supabase", "migrations");

function readMigrations(): string {
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(join(migrationsDir, name), "utf8"))
    .join("\n");
}

function store(overrides: Partial<Store> & Pick<Store, "id" | "handle" | "name">): Store {
  return {
    id: overrides.id,
    ownerUserId: null,
    name: overrides.name,
    handle: overrides.handle,
    storeType: overrides.storeType ?? "local",
    description: overrides.description ?? "Needlepoint shop",
    avatar: overrides.avatar ?? "/assets/needlepoint-hero.png",
    coverImage: overrides.coverImage ?? "/assets/needlepoint-hero.png",
    websiteUrl: overrides.websiteUrl ?? "https://example.com",
    location: overrides.location ?? [overrides.city ?? "Austin", overrides.region ?? "TX"].filter(Boolean).join(", "),
    city: overrides.city ?? "Austin",
    region: overrides.region ?? "TX",
    postalCode: overrides.postalCode ?? "78701",
    country: overrides.country ?? "US",
    shipsNationwide: overrides.shipsNationwide ?? false,
    specialties: overrides.specialties ?? ["threads"],
    products: overrides.products ?? [],
    projectCount: overrides.projectCount ?? 0,
    followerCount: overrides.followerCount ?? 0,
    latitude: overrides.latitude ?? 30.2672,
    longitude: overrides.longitude ?? -97.7431,
  };
}

test.describe("shop location search backend contract", () => {
  test("normalizes city/region and US ZIP or ZIP+4 inputs before querying", () => {
    expect(normalizeStoreSearchQuery({ city: "  Austin ", region: " tx ", zip: "78701-1234" })).toEqual({
      city: "austin",
      region: "tx",
      zip: "78701",
    });
    expect(normalizeStoreSearchQuery({ city: "", zip: "unknown" })).toEqual({ city: "", region: "", zip: "" });
  });

  test("normalizes discovery inputs with deterministic invalid and ambiguous cases", () => {
    expect(normalizeStoreDiscoveryInput({ mode: "zip", zip: "78701-1234" })).toMatchObject({
      ok: true,
      input: { mode: "zip", zip: "78701", radiusMiles: 60 },
    });
    expect(normalizeStoreDiscoveryInput({ mode: "zip", zip: "unknown" })).toMatchObject({
      ok: false,
      message: "Enter a 5-digit ZIP code.",
    });
    expect(normalizeStoreDiscoveryInput({ mode: "city", city: " Portland, or ", radiusMiles: 999 as 60 })).toMatchObject({
      ok: true,
      input: { mode: "city", city: "Portland", region: "OR", country: "US", radiusMiles: 150 },
    });
    expect(normalizeStoreDiscoveryInput({ mode: "point", lat: 91, lng: 0, source: "location" })).toMatchObject({
      ok: false,
      status: "invalid-input",
    });
  });

  test("builds stable discovery response with nearby list, map pins, counts, and online fallback", () => {
    const input: StoreDiscoveryInput = { mode: "point", lat: 30.2672, lng: -97.7431, radiusMiles: 60, source: "location" };
    const response = storeDiscoveryResponseFromStores(input, [
      store({ id: "near", handle: "near-shop", name: "Near Shop", latitude: 30.268, longitude: -97.744, projectCount: 1 }),
      store({ id: "far", handle: "far-shop", name: "Far Shop", city: "Dallas", latitude: 32.7767, longitude: -96.797, projectCount: 9 }),
      store({ id: "online", handle: "online-shop", name: "Online Shop", storeType: "online", shipsNationwide: true, latitude: null, longitude: null, projectCount: 12 }),
    ]);

    expect(response.status).toBe("ok");
    expect(response.query).toMatchObject({ mode: "point", radiusMiles: 60, center: { lat: 30.2672, lng: -97.7431 } });
    expect(response.list.map((item) => item.id)).toEqual(["near"]);
    expect(response.list[0]).toMatchObject({ detailUrl: "/stores/near-shop", proximityRank: "nearby" });
    expect(response.list[0].distanceMiles).toBeLessThan(1);
    expect(response.onlineFallback.map((item) => item.id)).toEqual(["online"]);
    expect(response.mapPins.map((pin) => pin.storeId)).toEqual(["near", "far"]);
    expect(response.counts).toMatchObject({ totalList: 1, localWithinRadius: 1, localOutsideRadius: 1, onlineFallback: 1, mapPins: 2 });
  });

  test("returns zero-local response without promoting online fallback into the primary radius list", () => {
    const response = storeDiscoveryResponseFromStores(
      { mode: "point", lat: 25.7617, lng: -80.1918, radiusMiles: 60, source: "location" },
      [
        store({ id: "far", handle: "far-shop", name: "Far Shop", latitude: 45.5152, longitude: -122.6784 }),
        store({ id: "online", handle: "online-shop", name: "Online Shop", storeType: "online", shipsNationwide: true, latitude: null, longitude: null, projectCount: 4 }),
      ],
    );

    expect(response.status).toBe("zero-local");
    expect(response.list).toEqual([]);
    expect(response.onlineFallback.map((item) => item.id)).toEqual(["online"]);
    expect(response.message).toContain("No local shops within 60 miles");
  });

  test("migration exposes public search_stores RPC with postal code ranking and fallback semantics", () => {
    const sql = readMigrations();

    expect(sql).toContain("add column if not exists postal_code text not null default ''");
    expect(sql).toContain("create or replace function public.search_stores");
    expect(sql).toContain("p_zip text default ''");
    expect(sql).toContain("p_city text default ''");
    expect(sql).toContain("p_region text default ''");
    expect(sql).toContain("postal_code = v_zip");
    expect(sql).toContain("lower(s.city) = v_city");
    expect(sql).toContain("grant execute on function public.search_stores(text, text, text, integer) to anon, authenticated");
    expect(sql).toContain("returns every public shop ordered by location relevance first, then online/catalog fallback strength");
  });

  test("migration exposes city/zip place resolution and JSON discovery RPC for list cards and map pins", () => {
    const sql = readMigrations();

    expect(sql).toContain("create table if not exists public.store_discovery_places");
    expect(sql).toContain("create or replace function public.search_store_discovery");
    expect(sql).toContain("p_radius_miles integer default 60");
    expect(sql).toContain("p_bounds jsonb default null");
    expect(sql).toContain("ambiguous-city");
    expect(sql).toContain("jsonb_build_object('list'");
    expect(sql).toContain("'mapPins'");
    expect(sql).toContain("grant execute on function public.search_store_discovery");
  });

  test("frontend API calls search_stores only for non-empty zip or city searches", () => {
    const storesApi = readFileSync(join(root, "src", "api", "stores.ts"), "utf8");

    expect(storesApi).toContain("export type StoreSearchQuery");
    expect(storesApi).toContain("normalizeStoreSearchQuery");
    expect(storesApi).toContain('client.rpc("search_stores"');
    expect(storesApi).toContain("p_zip: normalized.zip");
    expect(storesApi).toContain("p_city: normalized.city");
    expect(storesApi).toContain("p_region: normalized.region");
    expect(storesApi).toContain("export async function searchStoreDiscovery");
    expect(storesApi).toContain('client.rpc("search_store_discovery"');
    expect(storesApi).toContain("storeDiscoveryResponseFromStores");
  });
});
