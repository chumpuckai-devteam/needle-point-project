import { expect, test } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeStoreIdentifier } from "../src/api/stores";
import {
  findStoreByIdentifier,
  isStoresBrowseReturnPath,
  resolveStoresReturnTo,
  storeDetailPath,
} from "../src/lib/storeLinks";
import type { Store } from "../src/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const storesApi = readFileSync(path.join(root, "src/api/stores.ts"), "utf8");
const storeRoute = readFileSync(path.join(root, "src/pages/StoreRoute.tsx"), "utf8");
const storesPage = readFileSync(path.join(root, "src/pages/StoresPage.tsx"), "utf8");
const docs = readFileSync(path.join(root, "docs/supabase-setup.md"), "utf8");

function readMigrations(): string {
  const migrationsDir = path.join(root, "supabase", "migrations");
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(path.join(migrationsDir, name), "utf8"))
    .join("\n");
}

const sampleStores = [
  { id: "store-local-1", handle: "canopycanvas", name: "Canopy" },
  { id: "550e8400-e29b-41d4-a716-446655440000", handle: "threadandtonic", name: "Thread" },
] as Store[];

test.describe("store city browse backend contract", () => {
  test("normalizes deep-link identifiers without making handles unstable", () => {
    expect(normalizeStoreIdentifier("  @CanopyCanvas  ")).toBe("canopycanvas");
    expect(normalizeStoreIdentifier("/stores/ThreadAndTonic?from=city")).toBe("threadandtonic");
    expect(normalizeStoreIdentifier("550e8400-e29b-41d4-a716-446655440000")).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  test("migration exposes public city directory and store-detail RPCs", () => {
    const sql = readMigrations();

    expect(sql).toContain("create or replace function public.store_city_directory");
    expect(sql).toContain("returns table (");
    expect(sql).toContain("city text,");
    expect(sql).toContain("region text,");
    expect(sql).toContain("country text,");
    expect(sql).toContain("city_slug text,");
    expect(sql).toContain("shop_count integer,");
    expect(sql).toContain("example_shop_handles text[]");
    expect(sql).toContain("where s.city <> ''");
    expect(sql).toContain("s.store_type in ('local', 'both')");
    expect(sql).toContain("order by shop_count desc, lower(city), lower(region), lower(country)");
    expect(sql).toContain("grant execute on function public.store_city_directory(integer) to anon, authenticated");

    expect(sql).toContain("create or replace function public.store_detail(p_identifier text)");
    expect(sql).toContain("where lower(s.handle) = v_identifier");
    expect(sql).toContain("or s.id::text = v_identifier");
    expect(sql).toContain("project_count integer");
    expect(sql).toContain("follower_count bigint");
    expect(sql).toContain("grant execute on function public.store_detail(text) to anon, authenticated");
  });

  test("frontend API exposes documented city browse and stable detail response shapes", () => {
    expect(storesApi).toContain("export type StoreCityDirectoryEntry");
    expect(storesApi).toContain("export async function fetchStoreCityDirectory");
    expect(storesApi).toContain('client.rpc("store_city_directory"');
    expect(storesApi).toContain("export async function fetchStoreByIdentifier");
    expect(storesApi).toContain('client.rpc("store_detail"');
    expect(storesApi).toContain("p_identifier: normalizeStoreIdentifier(identifier)");
    expect(storesApi).toContain("export const fetchStoreBySlug = fetchStoreByIdentifier");
  });

  test("response shapes are documented for frontend consumers", () => {
    expect(docs).toContain("## 12. Store city browse and detail APIs");
    expect(docs).toContain("fetchStoreCityDirectory(limit?) -> StoreCityDirectoryEntry[]");
    expect(docs).toContain("fetchStoreByIdentifier(identifier) -> Store | null");
    expect(docs).toContain("Public browse: anon and authenticated clients can execute both RPCs");
  });

  test("store detail deep-link helpers resolve handle and id", () => {
    expect(storeDetailPath("CanopyCanvas")).toBe("/stores/canopycanvas");
    expect(storeDetailPath("/stores/ThreadAndTonic?x=1")).toBe("/stores/threadandtonic");
    expect(findStoreByIdentifier(sampleStores, "canopycanvas")?.id).toBe("store-local-1");
    expect(findStoreByIdentifier(sampleStores, "STORE-LOCAL-1")?.handle).toBe("canopycanvas");
    expect(findStoreByIdentifier(sampleStores, "550e8400-e29b-41d4-a716-446655440000")?.handle).toBe("threadandtonic");
    expect(isStoresBrowseReturnPath("/stores?city=Austin&region=TX")).toBe(true);
    expect(isStoresBrowseReturnPath("/stores/canopycanvas")).toBe(false);
    expect(resolveStoresReturnTo({ storesReturnTo: "/stores?city=Portland&region=OR" })).toBe(
      "/stores?city=Portland&region=OR",
    );
    expect(resolveStoresReturnTo({ storesReturnTo: "https://evil.example" })).toBe("/stores");
  });

  test("browse cards and store route wire shareable detail URLs", () => {
    expect(storesPage).toContain("to={detailHref}");
    expect(storesPage).toContain("storesReturnTo");
    expect(storesPage).toContain("data-store-handle");
    expect(storesPage).toContain("store-card-maps");
    expect(storesPage).toContain("storeMapLinks");
    expect(storeRoute).toContain("fetchStoreByIdentifier");
    expect(storeRoute).toContain("findStoreByIdentifier");
    expect(storeRoute).toContain("browseReturnTo");
    expect(storeRoute).toContain("storeDetailPath");
  });
});

test.describe("store Open in Maps links", () => {
  test("builds Apple + Google URLs from coordinates and hides pure online shops", async () => {
    const { appleMapsUrl, googleMapsUrl, storeHasMappablePlace, storeMapLinks } = await import("../src/lib/storeMaps");

    const local = {
      name: "Canopy Canvas",
      location: "Portland, OR",
      city: "Portland",
      region: "OR",
      postalCode: "97205",
      latitude: 45.5202471,
      longitude: -122.674194,
      storeType: "both",
    };
    expect(storeHasMappablePlace(local)).toBe(true);
    const links = storeMapLinks(local);
    expect(links?.apple).toMatch(/^https:\/\/maps\.apple\.com\/\?/);
    expect(links?.apple).toContain("45.5202471");
    expect(links?.google).toMatch(/google\.com\/maps/);
    expect(links?.google).toContain("45.5202471");
    expect(appleMapsUrl(local)).toBeTruthy();
    expect(googleMapsUrl(local)).toBeTruthy();

    const online = {
      name: "Thread & Tonic",
      location: "Ships nationwide",
      city: "",
      region: "",
      storeType: "online",
      latitude: null,
      longitude: null,
    };
    expect(storeHasMappablePlace(online)).toBe(false);
    expect(storeMapLinks(online)).toBeNull();
  });
});
