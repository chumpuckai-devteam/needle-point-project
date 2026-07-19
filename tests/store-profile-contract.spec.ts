import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const migration = readFileSync(
  path.join(root, "supabase/migrations/20260719201000_store_profile_api_rls.sql"),
  "utf8",
);
const storesApi = readFileSync(path.join(root, "src/api/stores.ts"), "utf8");

test.describe("store profile backend contract", () => {
  test("migration exposes owner-only validated store profile update path", () => {
    expect(migration).toContain("create or replace function public.update_store_profile");
    expect(migration).toContain("p_store_id uuid");
    expect(migration).toContain("p_specialties text[]");
    expect(migration).toContain("owner_user_id = (select auth.uid())");
    expect(migration).toContain("drop policy if exists \"stores_owner_write\"");
    expect(migration).toContain("drop policy if exists \"store_products_auth_write\"");
    expect(migration).toContain("grant execute on function public.update_store_profile");
    expect(migration).toContain("char_length(v_name) > 80");
    expect(migration).toContain("cardinality(v_specialties) > 10");
  });

  test("frontend API calls the RPC and rejects invalid profile inputs before network", () => {
    expect(storesApi).toContain("export type StoreProfileInput");
    expect(storesApi).toContain("export function validateStoreProfileInput");
    expect(storesApi).toContain("export async function updateStoreProfileOnline");
    expect(storesApi).toContain('client.rpc("update_store_profile"');
    expect(storesApi).toContain('throw new Error("Shop name is required.")');
    expect(storesApi).toContain('throw new Error("Website URL must start with http:// or https://.")');
    expect(storesApi).toContain('throw new Error("Choose up to 10 specialties.")');
  });
});
