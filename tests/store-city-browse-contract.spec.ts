import { expect, test } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeStoreIdentifier } from "../src/api/stores";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const storesApi = readFileSync(path.join(root, "src/api/stores.ts"), "utf8");
const docs = readFileSync(path.join(root, "docs/supabase-setup.md"), "utf8");

function readMigrations(): string {
  const migrationsDir = path.join(root, "supabase", "migrations");
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(path.join(migrationsDir, name), "utf8"))
    .join("\n");
}

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
});
