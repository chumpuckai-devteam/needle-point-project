import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = new URL("..", import.meta.url).pathname;
const migrationsDir = join(root, "supabase", "migrations");

function readMigrations() {
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(join(migrationsDir, name), "utf8"))
    .join("\n");
}

function readOptional(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

test("collections schema tracks one default Saved collection per user and guards deletion", () => {
  const sql = readMigrations();

  assert.match(sql, /alter table public\.collections add column if not exists is_default boolean not null default false/i);
  assert.match(sql, /create unique index if not exists collections_one_default_per_user_idx[\s\S]*where is_default/i);
  assert.match(sql, /create or replace function public\.ensure_default_collection/i);
  assert.match(sql, /create or replace function public\.prevent_default_collection_delete/i);
  assert.match(sql, /raise exception 'Default Saved collection cannot be deleted\.'/i);
  assert.match(sql, /execute function public\.prevent_default_collection_delete\(\)/i);
});

test("collections RLS isolates collections and membership to the owner", () => {
  const sql = readMigrations();

  assert.match(sql, /drop policy if exists "Users manage own collections" on public\.collections/i);
  assert.match(sql, /create policy "collections_select_own" on public\.collections[\s\S]*using \(\(select auth\.uid\(\)\) = user_id\)/i);
  assert.match(sql, /create policy "collection_items_insert_own_collection" on public\.collection_items/i);
  assert.match(sql, /create policy "collection_items_delete_own_collection" on public\.collection_items/i);
  assert.match(sql, /where c\.id = collection_id and c\.user_id = \(select auth\.uid\(\)\)/i);
  assert.match(sql, /create index if not exists collection_items_project_id_idx/i);
});

test("collections API exposes durable CRUD and item move helpers", () => {
  const collectionsApi = readOptional(join(root, "src", "api", "collections.ts"));
  const socialApi = readFileSync(join(root, "src", "api", "social.ts"), "utf8");
  const projectsApi = readFileSync(join(root, "src", "api", "projects.ts"), "utf8");

  assert.match(collectionsApi, /export type SavedCollection/);
  assert.match(collectionsApi, /export async function listCollectionsOnline/);
  assert.match(collectionsApi, /export async function createCollectionOnline/);
  assert.match(collectionsApi, /export async function renameCollectionOnline/);
  assert.match(collectionsApi, /export async function deleteCollectionOnline/);
  assert.match(collectionsApi, /export async function addProjectToCollectionOnline/);
  assert.match(collectionsApi, /export async function removeProjectFromCollectionOnline/);
  assert.match(collectionsApi, /export async function moveProjectBetweenCollectionsOnline/);
  assert.match(collectionsApi, /Default Saved collection cannot be deleted\./);
  assert.match(collectionsApi, /client\.rpc\("ensure_default_collection"\)/);
  assert.match(socialApi, /getDefaultCollectionOnline/);
  assert.match(projectsApi, /project_id, collections!inner\(user_id, is_default\)/);
});
