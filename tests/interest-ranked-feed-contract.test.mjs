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

test("recommendations schema persists surface-specific project dismissals with own-user RLS", () => {
  const sql = readMigrations();

  assert.match(sql, /create table if not exists public\.recommendation_dismissals/i);
  assert.match(sql, /surface text not null/i);
  assert.match(sql, /constraint recommendation_dismissals_surface_check check \(surface in \('discover', 'studio'\)\)/i);
  assert.match(sql, /primary key \(user_id, project_id, surface\)/i);
  assert.match(sql, /alter table public\.recommendation_dismissals enable row level security/i);
  assert.match(sql, /create policy "recommendation_dismissals_select_own"/i);
  assert.match(sql, /create policy "recommendation_dismissals_insert_own"/i);
  assert.match(sql, /create policy "recommendation_dismissals_delete_own"/i);
});

test("recommendation RPC ranks by onboarding interests and excludes skips before ordering", () => {
  const sql = readMigrations();

  assert.match(sql, /create or replace function public\.get_recommended_projects\(/i);
  assert.match(sql, /p_surface text default 'discover'/i);
  assert.match(sql, /profile_interests/i);
  assert.match(sql, /skill_level/i);
  assert.match(sql, /recommendation_dismissals/i);
  assert.match(sql, /not exists[\s\S]*rd\.user_id = v_user_id[\s\S]*rd\.project_id = p\.id[\s\S]*rd\.surface = p_surface/i);
  assert.match(sql, /case[\s\S]*florals[\s\S]*hydrangea[\s\S]*botanical/i);
  assert.match(sql, /case[\s\S]*ornaments[\s\S]*holiday/i);
  assert.match(sql, /least\([\s\S]*2\.50/i);
  assert.match(sql, /order by r\.recommendation_score desc, r\.updated_at desc, r\.id asc/i);
  assert.match(sql, /grant execute on function public\.get_recommended_projects/i);
});

test("projects API consumes ranked RPC results and exposes skip/dismiss helper", () => {
  const projectsApi = readFileSync(join(root, "src", "api", "projects.ts"), "utf8");
  const appShell = readOptional(join(root, "src", "app", "AppShell.tsx"));

  assert.match(projectsApi, /export type RecommendationSurface = "discover" \| "studio"/i);
  assert.match(projectsApi, /export async function fetchRecommendedProjects/i);
  assert.match(projectsApi, /client\.rpc\("get_recommended_projects"/i);
  assert.match(projectsApi, /p_surface: surface/i);
  assert.match(projectsApi, /export async function dismissRecommendedProjectOnline/i);
  assert.match(projectsApi, /from\("recommendation_dismissals"\)\.upsert/i);
  assert.match(appShell, /fetchRecommendedProjects\(\{ surface: "studio"/i);
});
