import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const migrationsDir = join(root, "supabase", "migrations");

function readMigrations() {
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(join(migrationsDir, name), "utf8"))
    .join("\n");
}

test("creator link click schema allows public inserts and creator-scoped reads", () => {
  const sql = readMigrations();

  assert.match(sql, /create table if not exists public\.creator_link_clicks/i);
  assert.match(sql, /profile_id uuid not null references public\.profiles \(id\)/i);
  assert.match(sql, /profile_link_id uuid not null references public\.profile_links \(id\)/i);
  assert.match(sql, /link_url text not null/i);
  assert.match(sql, /clicked_at timestamptz not null default now\(\)/i);
  assert.match(sql, /alter table public\.creator_link_clicks enable row level security/i);
  assert.match(sql, /create policy "creator_link_clicks_public_insert"/i);
  assert.match(sql, /to anon, authenticated/i);
  assert.match(sql, /pl\.id = creator_link_clicks\.profile_link_id/i);
  assert.match(sql, /pl\.profile_id = creator_link_clicks\.profile_id/i);
  assert.match(sql, /pl\.url = creator_link_clicks\.link_url/i);
  assert.match(sql, /p\.is_creator = true/i);
  assert.match(sql, /create policy "creator_link_clicks_creator_select"/i);
  assert.match(sql, /profile_id = \(select auth\.uid\(\)\)/i);
});

test("creator link click counts are aggregated only for the authenticated creator", () => {
  const sql = readMigrations();

  assert.match(sql, /create or replace function public\.creator_link_click_counts/i);
  assert.match(sql, /p_profile_id uuid default null/i);
  assert.match(sql, /p_profile_link_id uuid default null/i);
  assert.match(sql, /p_start_at timestamptz default null/i);
  assert.match(sql, /p_end_at timestamptz default null/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /v_profile_id <> \(select auth\.uid\(\)\)/i);
  assert.match(sql, /date_trunc\('day', clc\.clicked_at\)::date as click_day/i);
  assert.match(sql, /count\(\*\)::bigint as click_count/i);
  assert.match(sql, /grant execute on function public\.creator_link_click_counts/i);
});

test("creator link click client API inserts clicks and exposes counts RPC", () => {
  const apiPath = join(root, "src", "api", "creatorLinkClicks.ts");
  assert.ok(existsSync(apiPath), "src/api/creatorLinkClicks.ts should exist");
  const api = readFileSync(apiPath, "utf8");

  assert.match(api, /export type CreatorLinkClickInput/);
  assert.match(api, /export async function recordCreatorLinkClick/);
  assert.match(api, /new URL\(trimmed\)/);
  assert.match(api, /\.from\("creator_link_clicks"\)/);
  assert.match(api, /profile_id: input\.profileId/);
  assert.match(api, /profile_link_id: input\.profileLinkId/);
  assert.match(api, /link_url: linkUrl/);
  assert.match(api, /client\.rpc\("creator_link_click_counts"/);
  assert.doesNotMatch(api, /console\.(log|warn|error)|userAgent|sessionId|ipAddress/i);
});
