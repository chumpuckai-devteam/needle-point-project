import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = new URL("..", import.meta.url).pathname;
const migrationsDir = join(root, "supabase", "migrations");
const migrationFiles = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();
const claimMigrationName = migrationFiles.find((name) => name.endsWith("_shop_claim_requests.sql"));
assert.ok(claimMigrationName, "shop claim request migration should exist");
const ownerHardeningMigrationName = migrationFiles.find((name) => name.endsWith("_authoritative_shop_owner_rls.sql"));
assert.ok(ownerHardeningMigrationName, "authoritative shop owner RLS migration should exist");
const claimMigration = readFileSync(join(migrationsDir, claimMigrationName), "utf8");
const ownerHardeningMigration = readFileSync(join(migrationsDir, ownerHardeningMigrationName), "utf8");
const storesApi = readFileSync(join(root, "src", "api", "stores.ts"), "utf8");

test("shop claims use a request table and approved RPC path instead of open owner updates", () => {
  assert.match(claimMigration, /create table if not exists public\.store_claim_requests/i);
  assert.match(claimMigration, /create or replace function public\.request_store_claim/i);
  assert.match(claimMigration, /create or replace function public\.approve_store_claim_request/i);
  assert.match(claimMigration, /create or replace function public\.transfer_store_owner/i);
  assert.match(claimMigration, /drop policy if exists "stores_claim_unowned"/i);
  assert.doesNotMatch(claimMigration, /create policy "stores_claim_unowned"/i);
});

test("product writes remain owner-only and no legacy authenticated write policy is recreated", () => {
  assert.match(claimMigration, /drop policy if exists "store_products_auth_write"/i);
  assert.doesNotMatch(claimMigration, /create policy "store_products_auth_write"[\s\S]*auth\.uid\(\) is not null/i);
  assert.match(claimMigration, /create policy "store_products_owner_insert"[\s\S]*owner_user_id = \(select auth\.uid\(\)\)/i);
  assert.match(claimMigration, /create policy "store_products_owner_update"[\s\S]*owner_user_id = \(select auth\.uid\(\)\)/i);
  assert.match(claimMigration, /create policy "store_products_owner_delete"[\s\S]*owner_user_id = \(select auth\.uid\(\)\)/i);
});

test("client claim API calls the request RPC and never directly writes owner_user_id", () => {
  const claimFunction = storesApi.match(/export async function claimStoreOnline[\s\S]*?\n}\n/);
  assert.ok(claimFunction, "claimStoreOnline should exist for the current UI call site");
  assert.match(claimFunction[0], /\.rpc\("request_store_claim"/);
  assert.doesNotMatch(claimFunction[0], /\.from\("stores"\)[\s\S]*\.update\(\{[\s\S]*owner_user_id/);
});

test("normal authenticated clients cannot directly create, delete, or transfer shops", () => {
  assert.match(ownerHardeningMigration, /drop policy if exists "stores_owner_insert" on public\.stores/i);
  assert.match(ownerHardeningMigration, /drop policy if exists "stores_owner_delete" on public\.stores/i);
  assert.match(ownerHardeningMigration, /revoke insert on public\.stores from authenticated/i);
  assert.match(ownerHardeningMigration, /revoke delete on public\.stores from authenticated/i);
  assert.match(ownerHardeningMigration, /revoke update on public\.stores from authenticated/i);
  assert.match(ownerHardeningMigration, /grant update \(name, description, website_url, location, city, avatar_url, cover_image_url, specialties, updated_at\)/i);
  const updateGrantLines = ownerHardeningMigration.split("\n").filter((line) => /grant update/i.test(line));
  assert.ok(updateGrantLines.length > 0, "migration should restore a column-limited update grant");
  for (const line of updateGrantLines) {
    assert.doesNotMatch(line, /owner_user_id/i);
  }
});

test("store product upload paths include the policy-required product-id folder", () => {
  const pathFunction = storesApi.match(/function storeProductImagePath[\s\S]*?\n}\n/);
  assert.ok(pathFunction, "storeProductImagePath should define product image storage keys");
  assert.match(pathFunction[0], /`\$\{storeId\}\/\$\{safeProduct\}\//);
  assert.doesNotMatch(pathFunction[0], /`\$\{storeId\}\/\$\{safeProduct\}-\$\{crypto\.randomUUID\(\)\}/);
});
