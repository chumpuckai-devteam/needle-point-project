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

test("host meetup draw stats RPC is host-scoped and aggregate-only", () => {
  const sql = readMigrations();

  assert.match(sql, /create or replace function public\.host_meetup_draw_stats/i);
  assert.match(sql, /p_start_at timestamptz default null/i);
  assert.match(sql, /p_end_at timestamptz default null/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /v_host_id uuid := \(select auth\.uid\(\)\)/i);
  assert.match(sql, /m\.host_user_id = v_host_id/i);
  assert.match(sql, /meetups_hosted/i);
  assert.match(sql, /registrations/i);
  assert.match(sql, /checked_in/i);
  assert.match(sql, /waitlisted/i);
  assert.match(sql, /r\.status in \('registered', 'going', 'interested'\)/i);
  assert.match(sql, /r\.checked_in_at is not null/i);
  assert.match(sql, /grant execute on function public\.host_meetup_draw_stats/i);
  assert.match(sql, /to authenticated, service_role/i);
  // Aggregate only — RETURNS TABLE must not expose guest identity columns.
  // (host_user_id in the WHERE clause is intentional host scoping, not a guest leak.)
  const returnsTable =
    sql.match(
      /create or replace function public\.host_meetup_draw_stats[\s\S]*?returns table\s*\(([\s\S]*?)\)\s*language/i,
    )?.[1] ?? "";
  assert.match(returnsTable, /meetups_hosted/i);
  assert.match(returnsTable, /registrations/i);
  assert.match(returnsTable, /checked_in/i);
  assert.match(returnsTable, /waitlisted/i);
  assert.doesNotMatch(returnsTable, /display_name|avatar_url|\buser_id\b|handle|email/i);
});

test("host meetup draw client API + Mine tab panel are wired", () => {
  const apiPath = join(root, "src", "api", "meetups.ts");
  const panelPath = join(root, "src", "components", "HostMeetupAnalytics.tsx");
  const pagePath = join(root, "src", "pages", "MeetupsPage.tsx");
  assert.ok(existsSync(apiPath));
  assert.ok(existsSync(panelPath));
  assert.ok(existsSync(pagePath));

  const api = readFileSync(apiPath, "utf8");
  assert.match(api, /export type HostMeetupDrawStats/);
  assert.match(api, /export async function fetchHostMeetupDrawStats/);
  assert.match(api, /client\.rpc\("host_meetup_draw_stats"/);
  assert.match(api, /meetupsHosted/);
  assert.match(api, /checkedIn/);
  assert.doesNotMatch(api, /console\.(log|warn|error)|userAgent|sessionId|ipAddress/i);

  const panel = readFileSync(panelPath, "utf8");
  assert.match(panel, /fetchHostMeetupDrawStats/);
  assert.match(panel, /data-testid="host-meetup-analytics"/);
  assert.match(panel, /Meetup draw/);
  assert.match(panel, /Checked in/);
  assert.match(panel, /Registrations/);

  const page = readFileSync(pagePath, "utf8");
  assert.match(page, /HostMeetupAnalytics/);
  assert.match(page, /meetups-mine/);
});
