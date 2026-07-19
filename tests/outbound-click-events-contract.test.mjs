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

function readOutboundClickMigration() {
  const migrationName = readdirSync(migrationsDir)
    .filter((name) => name.endsWith("_outbound_click_events.sql"))
    .sort()
    .at(-1);
  assert.ok(migrationName, "outbound click events migration should exist");
  return readFileSync(join(migrationsDir, migrationName), "utf8");
}

test("outbound click events store only no-PII fields and block raw-row reads", () => {
  const sql = readOutboundClickMigration();

  assert.match(sql, /create table if not exists public\.outbound_click_events/i);
  assert.match(sql, /event_name text not null/i);
  assert.match(sql, /product_id uuid/i);
  assert.match(sql, /store_id uuid not null/i);
  assert.match(sql, /destination_type text not null/i);
  assert.match(sql, /destination_host text/i);
  assert.match(sql, /surface text not null/i);
  assert.match(sql, /placement text/i);
  assert.match(sql, /occurred_at timestamptz not null default now\(\)/i);
  assert.match(sql, /check \(event_name in \('shop_link_click', 'store_website_click'\)\)/i);
  assert.match(sql, /check \(destination_type in \('product_external_url', 'store_website_url'\)\)/i);
  assert.match(sql, /alter table public\.outbound_click_events enable row level security/i);
  assert.match(sql, /create policy "outbound_click_events_insert_anon_auth"/i);
  assert.doesNotMatch(sql, /payload\s+jsonb|metadata\s+jsonb|user_id\s+uuid|session_id|ip_address|user_agent|destination_url/i);
  assert.doesNotMatch(sql, /create policy "outbound_click_events_.*select/i);
});

test("outbound click counts are queryable by event and product or store over a time range", () => {
  const sql = readMigrations();

  assert.match(sql, /create or replace function public\.outbound_click_event_counts/i);
  assert.match(sql, /p_event_name text default null/i);
  assert.match(sql, /p_product_id uuid default null/i);
  assert.match(sql, /p_store_id uuid default null/i);
  assert.match(sql, /p_start_at timestamptz default null/i);
  assert.match(sql, /p_end_at timestamptz default null/i);
  assert.match(sql, /date_trunc\('day', oce\.occurred_at\)::date as event_day/i);
  assert.match(sql, /count\(\*\)::bigint as click_count/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /grant execute on function public\.outbound_click_event_counts/i);
});

test("click event client API normalizes hosts, never sends full URLs, and uses best-effort insert/count RPC", () => {
  const apiPath = join(root, "src", "api", "clickEvents.ts");
  assert.ok(existsSync(apiPath), "src/api/clickEvents.ts should exist");
  const analyticsApi = readFileSync(apiPath, "utf8");

  assert.match(analyticsApi, /export type OutboundClickEventName/);
  assert.match(analyticsApi, /export function normalizeDestinationHost/);
  assert.match(analyticsApi, /new URL\(destinationUrl\)/);
  assert.match(analyticsApi, /url\.hostname\.toLowerCase\(\)/);
  assert.match(analyticsApi, /event_name: input\.eventName/);
  assert.match(analyticsApi, /destination_host: normalizeDestinationHost\(input\.destinationUrl\)/);
  assert.match(analyticsApi, /\.from\("outbound_click_events"\)/);
  assert.match(analyticsApi, /client\.rpc\("outbound_click_event_counts"/);
  assert.doesNotMatch(analyticsApi, /destination_url|console\.(log|warn|error)|userAgent|sessionId/i);
});
