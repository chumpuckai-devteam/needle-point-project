import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
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

test("private project nested resources are visible only when the parent project is visible", () => {
  const sql = readMigrations();

  assert.match(sql, /drop policy if exists "Project tags readable" on public\.project_tags/i);
  assert.match(sql, /create policy "project_tags_visible_with_project"[\s\S]*on public\.project_tags[\s\S]*p\.id = project_id[\s\S]*p\.visibility = 'public'[\s\S]*p\.user_id = \(select auth\.uid\(\)\)/i);
  assert.match(sql, /create policy "comments_visible_with_target"[\s\S]*on public\.comments[\s\S]*target_type = 'project'[\s\S]*p\.visibility = 'public'[\s\S]*target_type = 'project_update'[\s\S]*pu\.project_id/i);
  assert.match(sql, /create policy "reactions_visible_with_target"[\s\S]*on public\.reactions[\s\S]*target_type = 'project'[\s\S]*p\.visibility = 'public'[\s\S]*target_type = 'project_update'[\s\S]*pu\.project_id/i);
  assert.match(sql, /create policy "stitch_along_submissions_visible_with_project"[\s\S]*on public\.stitch_along_submissions[\s\S]*p\.id = project_id[\s\S]*p\.visibility = 'public'[\s\S]*p\.user_id = \(select auth\.uid\(\)\)/i);
  assert.match(sql, /create policy "collection_items_visible_with_collection_and_project"[\s\S]*on public\.collection_items[\s\S]*c\.id = collection_id[\s\S]*p\.id = project_id[\s\S]*p\.visibility = 'public'[\s\S]*p\.user_id = \(select auth\.uid\(\)\)/i);
});

test("private project nested writes require owner-visible parent or target", () => {
  const sql = readMigrations();

  assert.match(sql, /create policy "Users insert own updates on own projects"[\s\S]*on public\.project_updates[\s\S]*auth\.uid\(\) = user_id[\s\S]*p\.id = project_id[\s\S]*p\.user_id = \(select auth\.uid\(\)\)/i);
  assert.match(sql, /create policy "Users insert visible comments"[\s\S]*on public\.comments[\s\S]*auth\.uid\(\) = user_id[\s\S]*target_type = 'project'[\s\S]*p\.visibility = 'public'[\s\S]*target_type = 'project_update'[\s\S]*pu\.project_id/i);
  assert.match(sql, /create policy "Users manage own visible reactions"[\s\S]*on public\.reactions[\s\S]*auth\.uid\(\) = user_id[\s\S]*target_type = 'project'[\s\S]*p\.visibility = 'public'[\s\S]*target_type = 'project_update'[\s\S]*pu\.project_id/i);
  assert.match(sql, /create policy "Users submit own visible projects"[\s\S]*on public\.stitch_along_submissions[\s\S]*auth\.uid\(\) = user_id[\s\S]*p\.id = project_id[\s\S]*p\.visibility = 'public'/i);
});
