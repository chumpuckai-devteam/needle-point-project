import { expect, test } from "@playwright/test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";

const root = cwd();
const migrationsDir = join(root, "supabase", "migrations");

function readMigrations(): string {
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(join(migrationsDir, name), "utf8"))
    .join("\n");
}

function readOptional(path: string): string {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

test.describe("collections backend contract", () => {
  test("schema tracks one default Saved collection per user and guards deletion", () => {
    const sql = readMigrations();

    expect(sql).toContain("alter table public.collections add column if not exists is_default boolean not null default false");
    expect(sql).toContain("create unique index if not exists collections_one_default_per_user_idx");
    expect(sql).toContain("where is_default");
    expect(sql).toContain("create or replace function public.ensure_default_collection");
    expect(sql).toContain("create or replace function public.prevent_default_collection_delete");
    expect(sql).toContain("raise exception 'Default Saved collection cannot be deleted.'");
    expect(sql).toContain("execute function public.prevent_default_collection_delete()");
  });

  test("RLS isolates collections and membership to the owner", () => {
    const sql = readMigrations();

    expect(sql).toContain("drop policy if exists \"Users manage own collections\" on public.collections");
    expect(sql).toContain("create policy \"collections_select_own\" on public.collections");
    expect(sql).toContain("using ((select auth.uid()) = user_id)");
    expect(sql).toContain("create policy \"collection_items_insert_own_collection\" on public.collection_items");
    expect(sql).toContain("create policy \"collection_items_delete_own_collection\" on public.collection_items");
    expect(sql).toContain("where c.id = collection_id and c.user_id = (select auth.uid())");
    expect(sql).toContain("create index if not exists collection_items_project_id_idx");
  });

  test("client API exposes durable collection CRUD and item move helpers", () => {
    const collectionsApi = readOptional(join(root, "src", "api", "collections.ts"));
    const socialApi = readFileSync(join(root, "src", "api", "social.ts"), "utf8");
    const projectsApi = readFileSync(join(root, "src", "api", "projects.ts"), "utf8");

    expect(collectionsApi).toContain("export type SavedCollection");
    expect(collectionsApi).toContain("export async function listCollectionsOnline");
    expect(collectionsApi).toContain("export async function createCollectionOnline");
    expect(collectionsApi).toContain("export async function renameCollectionOnline");
    expect(collectionsApi).toContain("export async function deleteCollectionOnline");
    expect(collectionsApi).toContain("export async function addProjectToCollectionOnline");
    expect(collectionsApi).toContain("export async function removeProjectFromCollectionOnline");
    expect(collectionsApi).toContain("export async function moveProjectBetweenCollectionsOnline");
    expect(collectionsApi).toContain("Default Saved collection cannot be deleted.");
    expect(collectionsApi).toContain('client.rpc("ensure_default_collection")');
    expect(socialApi).toContain("getDefaultCollectionOnline");
    expect(projectsApi).toContain("project_id, collections!inner(user_id, is_default)");
  });
});
