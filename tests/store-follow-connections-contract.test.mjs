import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = new URL("..", import.meta.url).pathname;
const migrationsDir = join(root, "supabase", "migrations");
const migrationFiles = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();
const allMigrations = migrationFiles.map((name) => readFileSync(join(migrationsDir, name), "utf8")).join("\n\n");
const storesApi = readFileSync(join(root, "src", "api", "stores.ts"), "utf8");
const setupDoc = readFileSync(join(root, "docs", "supabase-setup.md"), "utf8");

test("store follow connection RPCs are auth-aware, idempotent, and owner-safe", () => {
  assert.match(allMigrations, /create or replace function public\.follow_store\(p_store_id uuid\)/i);
  assert.match(allMigrations, /create or replace function public\.unfollow_store\(p_store_id uuid\)/i);
  assert.match(allMigrations, /create or replace function public\.is_following_store\(p_store_id uuid\)/i);
  assert.match(allMigrations, /create or replace function public\.my_store_following\(/i);
  assert.match(allMigrations, /create or replace function public\.store_followers\(p_store_id uuid/i);
  assert.match(allMigrations, /raise exception 'Authentication required\.'/i);
  assert.match(allMigrations, /raise exception 'Shop not found\.'/i);
  assert.match(allMigrations, /raise exception 'Shop owners cannot follow their own shop\.'/i);
  assert.match(allMigrations, /on conflict \(follower_id, store_id\) do nothing/i);
  assert.match(allMigrations, /delete from public\.store_follows[\s\S]*where follower_id = v_follower_id[\s\S]*and store_id = p_store_id/i);
  assert.match(allMigrations, /revoke all on function public\.follow_store\(uuid\) from public/i);
  assert.match(allMigrations, /grant execute on function public\.follow_store\(uuid\) to authenticated/i);
});

test("frontend API uses connection RPCs instead of direct store_follows writes", () => {
  assert.match(storesApi, /export type StoreFollowConnectionState/);
  assert.match(storesApi, /export async function followStoreOnline\(storeId: string\)/);
  assert.match(storesApi, /export async function unfollowStoreOnline\(storeId: string\)/);
  assert.match(storesApi, /export async function isFollowingStoreOnline\(storeId: string\)/);
  assert.match(storesApi, /export async function fetchStoreFollowers\(storeId: string/);
  assert.match(storesApi, /export async function fetchStoreFollowing/);
  assert.match(storesApi, /client\.rpc\("follow_store", \{ p_store_id: storeId \}\)/);
  assert.match(storesApi, /client\.rpc\("unfollow_store", \{ p_store_id: storeId \}\)/);
  assert.match(storesApi, /client\.rpc\("is_following_store", \{ p_store_id: storeId \}\)/);
  const toggleFunction = storesApi.match(/export async function toggleStoreFollowOnline[\s\S]*?\n}\n/);
  assert.ok(toggleFunction, "toggleStoreFollowOnline should remain for existing UI call sites");
  assert.doesNotMatch(toggleFunction[0], /\.from\("store_follows"\)/);
});

test("follow connection API contract is documented for UI and analytics consumers", () => {
  assert.match(setupDoc, /## 9\. Follow\/connection API contract/i);
  assert.match(setupDoc, /follow_store\(store_id\)/i);
  assert.match(setupDoc, /unfollow_store\(store_id\)/i);
  assert.match(setupDoc, /is_following_store\(store_id\)/i);
  assert.match(setupDoc, /my_store_following\(limit, offset\)/i);
  assert.match(setupDoc, /store_followers\(store_id, limit, offset\)/i);
  assert.match(setupDoc, /Analytics event/i);
});
